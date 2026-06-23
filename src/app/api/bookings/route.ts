import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

// ─── GET /api/bookings/[id] ───────────────────────────────────────────────────

export const GET = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        room: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const isStaff = ["ADMIN", "RECEPTION"].includes(req.user.role);
    if (!isStaff && booking.userId !== req.user.sub) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: booking });
  },
  ["CUSTOMER", "RECEPTION", "ADMIN"]
);

// ─── PATCH /api/bookings/[id] ─────────────────────────────────────────────────

const updateBookingSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"])
    .optional(),
  specialReqs: z.string().max(500).optional(),
});

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const booking = await prisma.booking.findUnique({ where: { id: params.id } });
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: parsed.data,
      include: {
        room: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    await logActivity({
      userId: req.user.sub,
      action: "UPDATE_BOOKING",
      resource: "bookings",
      resourceId: booking.id,
      details: { status: parsed.data.status },
      req,
    });

    return NextResponse.json({ success: true, data: updated });
  },
  ["RECEPTION", "ADMIN"]
);