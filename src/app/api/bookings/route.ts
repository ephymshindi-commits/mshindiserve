import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, rateLimit, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";
import { differenceInDays, parseISO, isBefore, startOfDay } from "date-fns";

const limiter = rateLimit(60_000, 20);

// ─── GET /api/bookings ────────────────────────────────────────────────────────

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    const limited = limiter(req);
    if (limited) return limited;

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const isStaff = ["ADMIN", "RECEPTION"].includes(req.user.role);

    const where = {
      ...(isStaff ? {} : { userId: req.user.sub }),
      ...(status ? { status: status.toUpperCase() as any } : {}),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          room: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: bookings, total, page, limit });
  },
  ["CUSTOMER", "RECEPTION", "ADMIN"]
);

// ─── POST /api/bookings ───────────────────────────────────────────────────────

const createBookingSchema = z.object({
  roomId: z.string().cuid(),
  checkIn: z.string().datetime({ message: "Invalid check-in date" }),
  checkOut: z.string().datetime({ message: "Invalid check-out date" }),
  guests: z.number().int().min(1).max(6).default(1),
  specialReqs: z.string().max(500).optional(),
});

export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    const limited = limiter(req);
    if (limited) return limited;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const { roomId, checkIn, checkOut, guests, specialReqs } = parsed.data;

    const checkInDate = parseISO(checkIn);
    const checkOutDate = parseISO(checkOut);
    const today = startOfDay(new Date());

    // Date validations
    if (isBefore(checkInDate, today)) {
      return NextResponse.json(
        { success: false, error: "Check-in date cannot be in the past" },
        { status: 400 }
      );
    }

    if (!isBefore(checkInDate, checkOutDate)) {
      return NextResponse.json(
        { success: false, error: "Check-out must be after check-in" },
        { status: 400 }
      );
    }

    const nights = differenceInDays(checkOutDate, checkInDate);
    if (nights > 30) {
      return NextResponse.json(
        { success: false, error: "Maximum stay is 30 nights" },
        { status: 400 }
      );
    }

    // Room exists & is generally available
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || !room.isAvailable) {
      return NextResponse.json(
        { success: false, error: "Room not found or unavailable" },
        { status: 404 }
      );
    }

    if (guests > room.capacity) {
      return NextResponse.json(
        { success: false, error: `Room capacity is ${room.capacity} guest(s)` },
        { status: 400 }
      );
    }

    // Check for date conflicts (no double booking)
    const conflict = await prisma.booking.findFirst({
      where: {
        roomId,
        status: { notIn: ["CANCELLED", "CHECKED_OUT"] },
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json(
        { success: false, error: "Room is not available for those dates" },
        { status: 409 }
      );
    }

    const totalAmount = room.pricePerNight * nights;

    // Generate booking number
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BK-${datePart}-${rand}`;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        userId: req.user.sub,
        roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        totalAmount,
        specialReqs,
        status: "PENDING",
      },
      include: {
        room: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    await logActivity({
      userId: req.user.sub,
      action: "CREATE_BOOKING",
      resource: "bookings",
      resourceId: booking.id,
      details: { bookingNumber, roomId, nights, totalAmount },
      req,
    });

    return NextResponse.json({ success: true, data: booking }, { status: 201 });
  },
  ["CUSTOMER", "ADMIN", "RECEPTION"]
);
