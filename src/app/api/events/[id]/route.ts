import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateEventSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().min(5).max(800).optional(),
  date: z.coerce.date().optional(),
  venue: z.string().min(2).max(120).optional(),
  ticketPrice: z.number().positive().optional(),
  totalSeats: z.number().int().min(1).max(5000).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
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

    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const existing = await prisma.event.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    if (parsed.data.totalSeats !== undefined && parsed.data.totalSeats < existing.soldSeats) {
      return NextResponse.json(
        { success: false, error: "Total seats cannot be below sold seats." },
        { status: 409 }
      );
    }

    if (parsed.data.ticketPrice !== undefined && existing.soldSeats > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot change ticket price after tickets have been sold." },
        { status: 409 }
      );
    }

    const { ticketPrice, ...rest } = parsed.data;
    const event = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(ticketPrice !== undefined ? { ticketPrice: Math.round(ticketPrice * 100) } : {}),
      },
    });

    await logActivity({
      userId: req.user.sub,
      action: "UPDATE_EVENT",
      resource: "events",
      resourceId: event.id,
      details: { title: event.title },
      req,
    });

    return NextResponse.json({ success: true, data: event });
  },
  ["ADMIN"]
);

export const DELETE = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteContext) => {
    const event = await prisma.event.findUnique({ where: { id: params.id } });
    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    if (event.soldSeats > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete - tickets already sold" },
        { status: 409 }
      );
    }

    await prisma.event.delete({ where: { id: params.id } });

    await logActivity({
      userId: req.user.sub,
      action: "DELETE_EVENT",
      resource: "events",
      resourceId: event.id,
      details: { title: event.title },
      req,
    });

    return NextResponse.json({ success: true, data: event });
  },
  ["ADMIN"]
);
