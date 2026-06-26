import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { eventSeedData, getDemoEvents } from "@/lib/fallback-data";
import { logActivity, rateLimit, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

const limiter = rateLimit(60_000, 60);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = limiter(req);
  if (limited) return limited;

  const includePast = req.nextUrl.searchParams.get("past") === "true";
  const available = req.nextUrl.searchParams.get("available");

  try {
    let events = await prisma.event.findMany({
      where: {
        ...(available === "false" ? {} : { isActive: true }),
        ...(includePast ? {} : { date: { gte: new Date() } }),
      },
      orderBy: { date: "asc" },
    });

    if (events.length === 0) {
      await prisma.event.createMany({ data: eventSeedData(), skipDuplicates: true });
      events = await prisma.event.findMany({
        where: {
          ...(available === "false" ? {} : { isActive: true }),
          ...(includePast ? {} : { date: { gte: new Date() } }),
        },
        orderBy: { date: "asc" },
      });
    }

    return NextResponse.json({
      success: true,
      data: events.length > 0 ? events : getDemoEvents(),
    });
  } catch (error) {
    console.error("[Events GET]", error);
    return NextResponse.json({ success: true, data: getDemoEvents(), fallback: true });
  }
}

const createEventSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(5).max(800),
  date: z.coerce.date(),
  venue: z.string().min(2).max(120).default("Fine Breeze Bar & Grill"),
  ticketPrice: z.number().int().positive(),
  totalSeats: z.number().int().min(1).max(5000),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const event = await prisma.event.create({ data: parsed.data });

    await logActivity({
      userId: req.user.sub,
      action: "CREATE_EVENT",
      resource: "events",
      resourceId: event.id,
      details: { title: event.title },
      req,
    });

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  },
  ["ADMIN"]
);
