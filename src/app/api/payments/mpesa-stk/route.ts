import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, rateLimit } from "@/lib/middleware";
import { initiateStkPush } from "@/lib/mpesa";
import type { AuthenticatedRequest } from "@/lib/middleware";

const limiter = rateLimit(60_000, 5); // 5 payment attempts per minute

const stkSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, "Enter a valid Safaricom number"),
  // Exactly one of these must be provided
  orderId: z.string().cuid().optional(),
  bookingId: z.string().cuid().optional(),
  ticketId: z.string().cuid().optional(),
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

    const parsed = stkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const { phoneNumber, orderId, bookingId, ticketId } = parsed.data;

    const sourceCount = [orderId, bookingId, ticketId].filter(Boolean).length;
    if (sourceCount !== 1) {
      return NextResponse.json(
        { success: false, error: "Provide exactly one of orderId, bookingId, or ticketId" },
        { status: 400 }
      );
    }

    // Resolve the amount and reference from the source
    let amount = 0;
    let reference = "";
    let description = "Fine Breeze Payment";

    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.userId !== req.user.sub) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }
      if (order.paymentStatus === "COMPLETED") {
        return NextResponse.json({ success: false, error: "Order already paid" }, { status: 400 });
      }
      amount = Math.ceil(order.totalAmount / 100); // cents → KES
      reference = order.orderNumber;
      description = "Food Order";
    }

    if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking || booking.userId !== req.user.sub) {
        return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
      }
      if (booking.paymentStatus === "COMPLETED") {
        return NextResponse.json({ success: false, error: "Booking already paid" }, { status: 400 });
      }
      amount = Math.ceil(booking.totalAmount / 100);
      reference = booking.bookingNumber;
      description = "Room Booking";
    }

    if (ticketId) {
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.userId !== req.user.sub) {
        return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
      }
      if (ticket.paymentStatus === "COMPLETED") {
        return NextResponse.json({ success: false, error: "Ticket already paid" }, { status: 400 });
      }
      amount = Math.ceil(ticket.totalAmount / 100);
      reference = ticket.ticketCode;
      description = "Event Ticket";
    }

    // Initiate STK Push
    let stkResult: Awaited<ReturnType<typeof initiateStkPush>>;
    try {
      stkResult = await initiateStkPush({ phoneNumber, amount, reference, description });
    } catch (err: any) {
      console.error("[MPesa STK]", err?.message);
      return NextResponse.json(
        { success: false, error: "Payment initiation failed — try again" },
        { status: 502 }
      );
    }

    if (stkResult.ResponseCode !== "0") {
      return NextResponse.json(
        { success: false, error: stkResult.ResponseDescription },
        { status: 400 }
      );
    }

    // Persist pending payment record
    await prisma.payment.create({
      data: {
        checkoutRequestId: stkResult.CheckoutRequestID,
        merchantRequestId: stkResult.MerchantRequestID,
        amount: amount * 100, // back to cents
        phoneNumber,
        status: "PENDING",
        orderId: orderId ?? null,
        bookingId: bookingId ?? null,
        ticketId: ticketId ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        checkoutRequestId: stkResult.CheckoutRequestID,
        message: "STK Push sent — check your phone to confirm payment",
      },
    });
  },
  ["CUSTOMER", "ADMIN"]
);
