import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOptionalAuth, isGuestCheckoutUser } from "@/lib/guest-checkout";
import type { PaymentStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resourceTypeSchema = z.enum(["order", "booking", "ticket"]);
type RouteContext = { params: { id: string } };

type PaymentStatusPayload = {
  status: PaymentStatus;
  mpesaRef: string | null;
  resultDesc: string | null;
  amount: number;
};

function paymentResponse(data: PaymentStatusPayload) {
  return NextResponse.json(
    { success: true, data },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const authUser = await getOptionalAuth(req);
  const parsedType = resourceTypeSchema.safeParse(req.nextUrl.searchParams.get("type"));
  if (!parsedType.success) {
    return NextResponse.json(
      { success: false, error: "Payment type must be order, booking, or ticket" },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (parsedType.data === "order") {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        payment: true,
        user: { select: { email: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const canViewOrder =
      authUser?.role === "ADMIN" ||
      authUser?.sub === order.userId ||
      (!authUser && isGuestCheckoutUser(order.user));
    if (!canViewOrder) {
      return NextResponse.json(
        { success: false, error: "You cannot view this payment" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    return paymentResponse({
      status: order.payment?.status ?? order.paymentStatus,
      mpesaRef: order.payment?.mpesaRef ?? order.mpesaRef,
      resultDesc: order.payment?.resultDesc ?? null,
      amount: order.payment?.amount ?? order.totalAmount,
    });
  }

  if (parsedType.data === "booking") {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        payment: true,
        user: { select: { email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const canViewBooking =
      authUser?.role === "ADMIN" ||
      authUser?.sub === booking.userId ||
      (!authUser && isGuestCheckoutUser(booking.user));
    if (!canViewBooking) {
      return NextResponse.json(
        { success: false, error: "You cannot view this payment" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    return paymentResponse({
      status: booking.payment?.status ?? booking.paymentStatus,
      mpesaRef: booking.payment?.mpesaRef ?? booking.mpesaRef,
      resultDesc: booking.payment?.resultDesc ?? null,
      amount: booking.payment?.amount ?? booking.totalAmount,
    });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      payment: true,
      user: { select: { email: true } },
    },
  });

  if (!ticket) {
    return NextResponse.json(
      { success: false, error: "Ticket not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const canViewTicket =
    authUser?.role === "ADMIN" ||
    authUser?.sub === ticket.userId ||
    (!authUser && isGuestCheckoutUser(ticket.user));
  if (!canViewTicket) {
    return NextResponse.json(
      { success: false, error: "You cannot view this payment" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  return paymentResponse({
    status: ticket.payment?.status ?? ticket.paymentStatus,
    mpesaRef: ticket.payment?.mpesaRef ?? ticket.mpesaRef,
    resultDesc: ticket.payment?.resultDesc ?? null,
    amount: ticket.payment?.amount ?? ticket.totalAmount,
  });
}
