import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { withAuth, rateLimit, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

const limiter = rateLimit(60_000, 10);

// ─── GET /api/tickets ─────────────────────────────────────────────────────────

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    const isAdmin = req.user.role === "ADMIN";
    const tickets = await prisma.ticket.findMany({
      where: isAdmin ? {} : { userId: req.user.sub },
      include: {
        event: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: tickets });
  },
  ["CUSTOMER", "ADMIN"]
);

// ─── POST /api/tickets ────────────────────────────────────────────────────────

const buyTicketSchema = z.object({
  eventId: z.string().cuid(),
  quantity: z.number().int().min(1).max(10),
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

    const parsed = buyTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const { eventId, quantity } = parsed.data;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || !event.isActive) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    const remaining = event.totalSeats - event.soldSeats;
    if (remaining < quantity) {
      return NextResponse.json(
        { success: false, error: `Only ${remaining} tickets remaining` },
        { status: 409 }
      );
    }

    const totalAmount = event.ticketPrice * quantity;

    // Generate unique ticket code: MS-TKT-XXXXXXXX
    const ticketCode = `MS-TKT-${uuidv4().slice(0, 8).toUpperCase()}`;

    const ticket = await prisma.ticket.create({
      data: {
        ticketCode,
        userId: req.user.sub,
        eventId,
        quantity,
        totalAmount,
        status: "ACTIVE",
        paymentStatus: "PENDING",
      },
      include: { event: true },
    });

    await logActivity({
      userId: req.user.sub,
      action: "CREATE_TICKET",
      resource: "tickets",
      resourceId: ticket.id,
      details: { eventId, quantity, ticketCode },
      req,
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  },
  ["CUSTOMER", "ADMIN"]
);
