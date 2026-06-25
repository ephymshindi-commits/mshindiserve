import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { demoRooms, roomSeedData } from "@/lib/fallback-data";
import { rateLimit, withAuth, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

const limiter = rateLimit(60_000, 60);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = limiter(req);
  if (limited) return limited;

  const available = req.nextUrl.searchParams.get("available");

  try {
    let rooms = await prisma.room.findMany({
      where: available === "false" ? {} : { isAvailable: true },
      orderBy: [{ sortOrder: "asc" }, { pricePerNight: "asc" }],
    });

    if (rooms.length === 0) {
      await prisma.room.createMany({ data: roomSeedData(), skipDuplicates: true });
      rooms = await prisma.room.findMany({
        where: available === "false" ? {} : { isAvailable: true },
        orderBy: [{ sortOrder: "asc" }, { pricePerNight: "asc" }],
      });
    }

    return NextResponse.json({ success: true, data: rooms.length > 0 ? rooms : demoRooms });
  } catch (error) {
    console.error("[Rooms GET]", error);
    return NextResponse.json({ success: true, data: demoRooms, fallback: true });
  }
}

const createRoomSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(5).max(500),
  pricePerNight: z.number().int().positive(),
  capacity: z.number().int().min(1).max(10),
  amenities: z.array(z.string().min(1).max(60)).default([]),
  imageUrl: z.string().url().optional().nullable(),
  emoji: z.string().max(8).default("RM"),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const room = await prisma.room.create({ data: parsed.data });

    await logActivity({
      userId: req.user.sub,
      action: "CREATE_ROOM",
      resource: "rooms",
      resourceId: room.id,
      details: { name: room.name },
      req,
    });

    return NextResponse.json({ success: true, data: room }, { status: 201 });
  },
  ["ADMIN"]
);
