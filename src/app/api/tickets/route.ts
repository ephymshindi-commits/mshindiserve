import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { withAuth, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";
import { clientIp, ticketLimiter } from "@/lib/rate-limit";
import { getOptionalAuth, getOrCreateGuestUser } from "@/lib/guest-checkout";

export const dynamic = "force-dynamic";
const MAX_RETRIES = 3;

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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function purchaseWithRetry(eventId: string, quantity: number, userId: string) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const updated = await tx.$executeRaw`
            UPDATE events
            SET "soldSeats" = "soldSeats" + ${quantity}
            WHERE id = ${eventId}
              AND "isActive" = true
              AND date > NOW()
              AND ("soldSeats" + ${quantity}) <= "totalSeats"
          `;

          if (updated === 0) {
            const event = await tx.event.findUnique({
              where: { id: eventId },
              select: {
                isActive: true,
                date: true,
                totalSeats: true,
                soldSeats: true,
              },
            });

            if (!event || !event.isActive) throw new Error("EVENT_NOT_FOUND");
            if (event.date <= new Date()) throw new Error("EVENT_PAST");
            throw new Error(`SEATS:${Math.max(0, event.totalSeats - event.soldSeats)}`);
          }

          const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });

          return tx.ticket.create({
            data: {
              ticketCode: newTicketCode(),
              userId,
              eventId,
              quantity,
              totalAmount: event.ticketPrice * quantity,
              status: "ACTIVE",
              paymentStatus: "PENDING",
            },
            include: { event: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
      );
    } catch (error) {
      const isConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

      if (isConflict && attempt < MAX_RETRIES - 1) {
        await wait(50 * (attempt + 1));
        continue;
      }

      if (isConflict) throw new Error("SERVER_BUSY");
      throw error;
    }
  }

  throw new Error("SERVER_BUSY");
}

export async function POST(req: NextRequest) {
  const authUser = await getOptionalAuth(req);
  const limited = await ticketLimiter?.check(authUser?.sub ?? clientIp(req));
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

  const guestUser = authUser ? null : await getOrCreateGuestUser();
  const userId = authUser?.sub ?? guestUser!.id;
  const { eventId, quantity } = parsed.data;

  try {
    const ticket = await purchaseWithRetry(eventId, quantity, userId);

    await logActivity({
      userId,
      action: "CREATE_TICKET",
      resource: "tickets",
      resourceId: ticket.id,
      details: {
        eventId,
        quantity,
        ticketCode: ticket.ticketCode,
        checkoutMode: authUser ? "authenticated" : "guest",
      },
      req,
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EVENT_NOT_FOUND") {
        return NextResponse.json(
          { success: false, error: "Event not found or no longer active" },
          { status: 404 }
        );
      }
      if (error.message === "EVENT_PAST") {
        return NextResponse.json(
          { success: false, error: "This event has already taken place" },
          { status: 409 }
        );
      }
      if (error.message.startsWith("SEATS:")) {
        const remaining = error.message.replace("SEATS:", "");
        return NextResponse.json(
          { success: false, error: `Only ${remaining} tickets remaining` },
          { status: 409 }
        );
      }
      if (error.message === "SERVER_BUSY") {
        return NextResponse.json(
          { success: false, error: "Server busy, please try again" },
          { status: 503 }
        );
      }
    }
    throw error;
  }
}
