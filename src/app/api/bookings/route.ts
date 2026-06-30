import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, logActivity, rateLimit } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";
import { roomSeedData } from "@/lib/fallback-data";
import { getOptionalAuth, getOrCreateGuestUser } from "@/lib/guest-checkout";

const limiter = rateLimit(60_000, 20);

export const dynamic = "force-dynamic";

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    const limited = limiter(req);
    if (limited) return limited;

    const status = req.nextUrl.searchParams.get("status")?.toUpperCase();
    const isStaff = ["ADMIN", "RECEPTION"].includes(req.user.role);

    const bookings = await prisma.booking.findMany({
      where: {
        ...(isStaff ? {} : { userId: req.user.sub }),
        ...(status ? { status: status as never } : {}),
      },
      include: {
        room: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: bookings });
  },
  ["CUSTOMER", "RECEPTION", "ADMIN"]
);

const createBookingSchema = z
  .object({
    roomId: z.string().min(1),
    checkIn: z.coerce.date(),
    checkOut: z.coerce.date(),
    guests: z.number().int().min(1).max(8),
    specialReqs: z.string().max(500).optional(),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

function nightsBetween(checkIn: Date, checkOut: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / msPerDay));
}

function newBookingNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BK-${datePart}-${rand}`;
}

export async function POST(req: NextRequest) {
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

  const authUser = await getOptionalAuth(req);
  const guestUser = authUser ? null : await getOrCreateGuestUser();
  const userId = authUser?.sub ?? guestUser!.id;

  const { roomId, checkIn, checkOut, guests, specialReqs } = parsed.data;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (checkIn < today) {
    return NextResponse.json(
      { success: false, error: "Check-in cannot be in the past" },
      { status: 422 }
    );
  }

  let booking: Awaited<ReturnType<typeof prisma.booking.create>>;

  try {
    booking = await prisma.$transaction(
      async (tx) => {
        let room = await tx.room.findUnique({ where: { id: roomId } });

        if (!room) {
          await tx.room.createMany({ data: roomSeedData(), skipDuplicates: true });
          room = await tx.room.findUnique({ where: { id: roomId } });
        }

        if (!room || !room.isAvailable) {
          throw new Error("ROOM_UNAVAILABLE");
        }

        if (guests > room.capacity) {
          throw new Error("ROOM_CAPACITY");
        }

        const conflict = await tx.booking.findFirst({
          where: {
            roomId,
            status: { notIn: ["CANCELLED", "CHECKED_OUT"] },
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
          },
          select: { id: true },
        });

        if (conflict) {
          throw new Error("ROOM_CONFLICT");
        }

        const totalAmount = room.pricePerNight * nightsBetween(checkIn, checkOut);

        return tx.booking.create({
          data: {
            bookingNumber: newBookingNumber(),
            userId,
            roomId,
            checkIn,
            checkOut,
            guests,
            totalAmount,
            specialReqs,
            status: "PENDING",
            paymentStatus: "PENDING",
          },
          include: {
            room: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ROOM_UNAVAILABLE") {
        return NextResponse.json({ success: false, error: "Room is unavailable" }, { status: 404 });
      }
      if (error.message === "ROOM_CAPACITY") {
        return NextResponse.json(
          { success: false, error: "Guest count exceeds room capacity" },
          { status: 422 }
        );
      }
      if (error.message === "ROOM_CONFLICT") {
        return NextResponse.json(
          { success: false, error: "This room is already booked for those dates" },
          { status: 409 }
        );
      }
    }
    throw error;
  }

  await logActivity({
    userId,
    action: "CREATE_BOOKING",
    resource: "bookings",
    resourceId: booking.id,
    details: {
      bookingNumber: booking.bookingNumber,
      roomId,
      checkIn,
      checkOut,
      checkoutMode: authUser ? "authenticated" : "guest",
    },
    req,
  });

  return NextResponse.json({ success: true, data: booking }, { status: 201 });
}
