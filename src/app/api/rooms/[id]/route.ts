import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateRoomSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().min(5).max(500).optional(),
  pricePerNight: z.number().positive().optional(),
  capacity: z.number().int().min(1).max(10).optional(),
  amenities: z.array(z.string().min(1).max(60)).optional(),
  imageUrl: z.string().url().nullable().optional(),
  emoji: z.string().max(8).optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type RouteContext = { params: { id: string } };

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteContext) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const { pricePerNight, ...rest } = parsed.data;
    const room = await prisma.room.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(pricePerNight !== undefined ? { pricePerNight: Math.round(pricePerNight * 100) } : {}),
      },
    });

    await logActivity({
      userId: req.user.sub,
      action: "UPDATE_ROOM",
      resource: "rooms",
      resourceId: room.id,
      details: { name: room.name },
      req,
    });

    return NextResponse.json({ success: true, data: room });
  },
  ["ADMIN"]
);

export const DELETE = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteContext) => {
    const activeBookingCount = await prisma.booking.count({
      where: {
        roomId: params.id,
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
    });

    if (activeBookingCount > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete - ${activeBookingCount} active booking(s)` },
        { status: 409 }
      );
    }

    const room = await prisma.room.delete({ where: { id: params.id } });

    await logActivity({
      userId: req.user.sub,
      action: "DELETE_ROOM",
      resource: "rooms",
      resourceId: room.id,
      details: { name: room.name },
      req,
    });

    return NextResponse.json({ success: true, data: room });
  },
  ["ADMIN"]
);
