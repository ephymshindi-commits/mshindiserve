import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { withAuth, rateLimit, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";
import { eventSeedData } from "@/lib/fallback-data";

const limiter = rateLimit(60_000, 10);

export const dynamic = "force-dynamic";

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

const buyTicketSchema = z.object({
  eventId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});

function newTicketCode() {
  return `MS-TKT-${uuidv4().slice(0, 8).toUpperCase()}`;
}

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

    try {
      const ticket = await prisma.$transaction(
        async (tx) => {
          let event = await tx.event.findUnique({ where: { id: eventId } });

          if (!event) {
            await tx.event.createMany({ data: eventSeedData(), skipDuplicates: true });
            event = await tx.event.findUnique({ where: { id: eventId } });
          }

          if (!event || !event.isActive || event.date < new Date()) {
            throw new Error("EVENT_NOT_FOUND");
          }

          const remaining = event.totalSeats - event.soldSeats;
          if (remaining < quantity) {
            throw new Error(`ONLY_${Math.max(0, remaining)}_LEFT`);
          }

          await tx.event.update({
            where: { id: eventId },
            data: { soldSeats: { increment: quantity } },
          });

          return tx.ticket.create({
            data: {
              ticketCode: newTicketCode(),
              userId: req.user.sub,
              eventId,
              quantity,
              totalAmount: event.ticketPrice * quantity,
              status: "ACTIVE",
              paymentStatus: "PENDING",
            },
            include: { event: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      await logActivity({
        userId: req.user.sub,
        action: "CREATE_TICKET",
        resource: "tickets",
        resourceId: ticket.id,
        details: { eventId, quantity, ticketCode: ticket.ticketCode },
        req,
      });

      return NextResponse.json({ success: true, data: ticket }, { status: 201 });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "EVENT_NOT_FOUND") {
          return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
        }
        if (error.message.startsWith("ONLY_")) {
          const remaining = error.message.replace("ONLY_", "").replace("_LEFT", "");
          return NextResponse.json(
            { success: false, error: `Only ${remaining} tickets remaining` },
            { status: 409 }
          );
        }
      }
      throw error;
    }
  },
  ["CUSTOMER", "ADMIN"]
);
