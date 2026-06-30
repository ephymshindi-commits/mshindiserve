import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOptionalAuth, isGuestCheckoutUser } from "@/lib/guest-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const simulateSchema = z
  .object({
    orderId: z.string().min(1).optional(),
    bookingId: z.string().min(1).optional(),
    ticketId: z.string().min(1).optional(),
    phoneNumber: z.string().max(20).optional(),
  })
  .refine((data) => [data.orderId, data.bookingId, data.ticketId].filter(Boolean).length === 1, {
    message: "Provide exactly one payment source",
    path: ["orderId"],
  });

function demoPaymentsEnabled() {
  return process.env.DEMO_MODE !== "false" && process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

function demoRef() {
  return `DEMO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function checkoutRef(resourceType: string) {
  return `SIM-${resourceType.toUpperCase()}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function cleanPhone(phoneNumber?: string) {
  return phoneNumber?.replace(/\s/g, "") || "0700000000";
}

export async function POST(req: NextRequest) {
  if (!demoPaymentsEnabled()) {
    return NextResponse.json(
      { success: false, error: "Demo payment simulation is disabled." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = simulateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  const authUser = await getOptionalAuth(req);
  const { orderId, bookingId, ticketId } = parsed.data;
  const phoneNumber = cleanPhone(parsed.data.phoneNumber);
  const mpesaRef = demoRef();

  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        user: { select: { email: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const canSimulate =
      authUser?.role === "ADMIN" ||
      authUser?.sub === order.userId ||
      (!authUser && isGuestCheckoutUser(order.user));

    if (!canSimulate) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "COMPLETED") {
      return NextResponse.json({
        success: true,
        data: {
          resourceType: "order",
          id: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          mpesaRef: order.mpesaRef ?? order.payment?.mpesaRef ?? null,
        },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: "COMPLETED",
            mpesaRef,
            amount: order.totalAmount,
            phoneNumber,
            resultCode: "0",
            resultDesc: "Demo payment success",
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: order.totalAmount,
            phoneNumber,
            status: "COMPLETED",
            mpesaRef,
            checkoutRequestId: checkoutRef("order"),
            merchantRequestId: checkoutRef("merchant"),
            resultCode: "0",
            resultDesc: "Demo payment success",
          },
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "COMPLETED",
          mpesaRef,
          status: "CONFIRMED",
        },
        include: {
          payment: true,
          orderItems: { include: { menuItem: true } },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        resourceType: "order",
        id: updated.id,
        orderNumber: updated.orderNumber,
        paymentStatus: updated.paymentStatus,
        mpesaRef: updated.mpesaRef,
      },
    });
  }

  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        user: { select: { email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const canSimulate =
      authUser?.role === "ADMIN" ||
      authUser?.sub === booking.userId ||
      (!authUser && isGuestCheckoutUser(booking.user));

    if (!canSimulate) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    if (booking.paymentStatus === "COMPLETED") {
      return NextResponse.json({
        success: true,
        data: {
          resourceType: "booking",
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          paymentStatus: booking.paymentStatus,
          mpesaRef: booking.mpesaRef ?? booking.payment?.mpesaRef ?? null,
        },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (booking.payment) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: "COMPLETED",
            mpesaRef,
            amount: booking.totalAmount,
            phoneNumber,
            resultCode: "0",
            resultDesc: "Demo payment success",
          },
        });
      } else {
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            amount: booking.totalAmount,
            phoneNumber,
            status: "COMPLETED",
            mpesaRef,
            checkoutRequestId: checkoutRef("booking"),
            merchantRequestId: checkoutRef("merchant"),
            resultCode: "0",
            resultDesc: "Demo payment success",
          },
        });
      }

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: "COMPLETED",
          mpesaRef,
          status: "CONFIRMED",
        },
        include: { payment: true, room: true },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        resourceType: "booking",
        id: updated.id,
        bookingNumber: updated.bookingNumber,
        paymentStatus: updated.paymentStatus,
        mpesaRef: updated.mpesaRef,
      },
    });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      payment: true,
      user: { select: { email: true } },
    },
  });

  if (!ticket) {
    return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
  }

  const canSimulate =
    authUser?.role === "ADMIN" ||
    authUser?.sub === ticket.userId ||
    (!authUser && isGuestCheckoutUser(ticket.user));

  if (!canSimulate) {
    return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.paymentStatus === "COMPLETED") {
    return NextResponse.json({
      success: true,
      data: {
        resourceType: "ticket",
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        paymentStatus: ticket.paymentStatus,
        mpesaRef: ticket.mpesaRef ?? ticket.payment?.mpesaRef ?? null,
      },
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (ticket.payment) {
      await tx.payment.update({
        where: { id: ticket.payment.id },
        data: {
          status: "COMPLETED",
          mpesaRef,
          amount: ticket.totalAmount,
          phoneNumber,
          resultCode: "0",
          resultDesc: "Demo payment success",
        },
      });
    } else {
      await tx.payment.create({
        data: {
          ticketId: ticket.id,
          amount: ticket.totalAmount,
          phoneNumber,
          status: "COMPLETED",
          mpesaRef,
          checkoutRequestId: checkoutRef("ticket"),
          merchantRequestId: checkoutRef("merchant"),
          resultCode: "0",
          resultDesc: "Demo payment success",
        },
      });
    }

    return tx.ticket.update({
      where: { id: ticket.id },
      data: {
        paymentStatus: "COMPLETED",
        mpesaRef,
        status: "ACTIVE",
      },
      include: { payment: true, event: true },
    });
  });

  return NextResponse.json({
    success: true,
    data: {
      resourceType: "ticket",
      id: updated.id,
      ticketCode: updated.ticketCode,
      paymentStatus: updated.paymentStatus,
      mpesaRef: updated.mpesaRef,
    },
  });
}
