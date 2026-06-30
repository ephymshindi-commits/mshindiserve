import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { initiateStkPush } from "@/lib/mpesa";
import { clientIp, mpesaLimiter } from "@/lib/rate-limit";
import { getOptionalAuth, isGuestCheckoutUser } from "@/lib/guest-checkout";

const stkSchema = z.object({
  phoneNumber: z.string().regex(/^(\+254|0)[17]\d{8}$/, "Enter a valid Safaricom number"),
  orderId: z.string().min(1).optional(),
  bookingId: z.string().min(1).optional(),
  ticketId: z.string().min(1).optional(),
});

export const dynamic = "force-dynamic";

function hasMpesaConfig() {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_URL
  );
}

export async function POST(req: NextRequest) {
  const authUser = await getOptionalAuth(req);
  const limited = await mpesaLimiter?.check(authUser?.sub ?? clientIp(req));
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
      { success: false, error: "Provide exactly one payment source" },
      { status: 400 }
    );
  }

  let amount = 0;
  let reference = "";
  let description = "Fine Breeze Payment";

  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true } } },
    });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const canPayOrder =
      authUser?.role === "ADMIN" ||
      authUser?.sub === order.userId ||
      (!authUser && isGuestCheckoutUser(order.user));
    if (!canPayOrder) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "COMPLETED") {
      return NextResponse.json({ success: false, error: "Order already paid" }, { status: 400 });
    }

    amount = Math.ceil(order.totalAmount / 100);
    reference = order.orderNumber;
    description = "Food Order";
  }

  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: { select: { email: true } } },
    });
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const canPayBooking =
      authUser?.role === "ADMIN" ||
      authUser?.sub === booking.userId ||
      (!authUser && isGuestCheckoutUser(booking.user));
    if (!canPayBooking) {
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
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { email: true } } },
    });
    if (!ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const canPayTicket =
      authUser?.role === "ADMIN" ||
      authUser?.sub === ticket.userId ||
      (!authUser && isGuestCheckoutUser(ticket.user));
    if (!canPayTicket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.paymentStatus === "COMPLETED") {
      return NextResponse.json({ success: false, error: "Ticket already paid" }, { status: 400 });
    }
    amount = Math.ceil(ticket.totalAmount / 100);
    reference = ticket.ticketCode;
    description = "Event Ticket";
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      OR: [
        ...(orderId ? [{ orderId }] : []),
        ...(bookingId ? [{ bookingId }] : []),
        ...(ticketId ? [{ ticketId }] : []),
      ],
    },
  });

  if (existingPayment?.status === "PENDING") {
    return NextResponse.json({
      success: true,
      data: {
        checkoutRequestId: existingPayment.checkoutRequestId,
        message: "Payment request is already pending",
      },
    });
  }

  async function createPendingPayment(checkoutRequestId: string, merchantRequestId: string) {
    if (existingPayment) {
      return prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          checkoutRequestId,
          merchantRequestId,
          amount: amount * 100,
          phoneNumber,
          status: "PENDING",
          resultCode: null,
          resultDesc: null,
        },
      });
    }

    return prisma.payment.create({
      data: {
        checkoutRequestId,
        merchantRequestId,
        amount: amount * 100,
        phoneNumber,
        status: "PENDING",
        orderId: orderId ?? null,
        bookingId: bookingId ?? null,
        ticketId: ticketId ?? null,
      },
    });
  }

  if (!hasMpesaConfig()) {
    const checkoutRequestId = `DEMO-${Date.now()}`;
    await createPendingPayment(checkoutRequestId, `DEMO-MERCHANT-${Date.now()}`);

    return NextResponse.json({
      success: true,
      data: {
        checkoutRequestId,
        demoMode: true,
        message: "Demo payment recorded. Configure M-Pesa credentials to send live prompts.",
      },
    });
  }

  let stkResult: Awaited<ReturnType<typeof initiateStkPush>>;
  try {
    stkResult = await initiateStkPush({ phoneNumber, amount, reference, description });
  } catch (error) {
    console.error("[MPesa STK]", error);

    if (process.env.NODE_ENV !== "production") {
      const checkoutRequestId = `DEMO-${Date.now()}`;
      await createPendingPayment(checkoutRequestId, `DEMO-MERCHANT-${Date.now()}`);

      return NextResponse.json({
        success: true,
        data: {
          checkoutRequestId,
          demoMode: true,
          message: "Demo payment recorded because live M-Pesa is unavailable locally.",
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Payment initiation failed. Please try again." },
      { status: 502 }
    );
  }

  if (stkResult.ResponseCode !== "0") {
    return NextResponse.json(
      { success: false, error: stkResult.ResponseDescription },
      { status: 400 }
    );
  }

  await createPendingPayment(stkResult.CheckoutRequestID, stkResult.MerchantRequestID);

  return NextResponse.json({
    success: true,
    data: {
      checkoutRequestId: stkResult.CheckoutRequestID,
      message: "STK Push sent. Check your phone to confirm payment.",
    },
  });
}
