import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMpesaCallback, type MpesaCallbackBody } from "@/lib/mpesa";

/**
 * POST /api/payments/mpesa-callback
 *
 * Called by Safaricom servers after the customer confirms/cancels.
 * This is the ONLY place we trust payment confirmation — NEVER the frontend.
 *
 * Security notes:
 * - This endpoint must NOT require auth (Safaricom calls it directly)
 * - Validate the payload structure carefully
 * - Use HTTPS in production — enforce at infra level
 * - Optionally whitelist Safaricom IPs at the load balancer
 */
export async function POST(req: NextRequest) {
  let body: MpesaCallbackBody;
  try {
    body = await req.json();
  } catch {
    // Always return 200 to Safaricom — they retry on non-200
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  // Validate payload shape
  if (!body?.Body?.stkCallback?.CheckoutRequestID) {
    console.error("[MPesa Callback] Malformed payload", JSON.stringify(body));
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const parsed = parseMpesaCallback(body);
  console.log("[MPesa Callback]", parsed);

  // Find the pending payment record
  const payment = await prisma.payment.findUnique({
    where: { checkoutRequestId: parsed.checkoutRequestId },
  });

  if (!payment) {
    console.warn("[MPesa Callback] No payment found for", parsed.checkoutRequestId);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  // Idempotency — ignore if already processed
  if (payment.status !== "PENDING") {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  if (parsed.success && parsed.mpesaRef) {
    // ── Payment succeeded ────────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      // Update payment record
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          mpesaRef: parsed.mpesaRef,
          resultCode: parsed.resultCode,
          resultDesc: parsed.resultDesc,
        },
      });

      // Update the linked resource
      if (payment.orderId) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: "COMPLETED",
            mpesaRef: parsed.mpesaRef,
            status: "CONFIRMED",
          },
        });
      }

      if (payment.bookingId) {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentStatus: "COMPLETED",
            mpesaRef: parsed.mpesaRef,
            status: "CONFIRMED",
          },
        });
      }

      if (payment.ticketId) {
        await tx.ticket.update({
          where: { id: payment.ticketId },
          data: {
            paymentStatus: "COMPLETED",
            mpesaRef: parsed.mpesaRef,
            status: "ACTIVE",
          },
        });
        // Update event soldSeats
        const ticket = await tx.ticket.findUnique({ where: { id: payment.ticketId } });
        if (ticket) {
          await tx.event.update({
            where: { id: ticket.eventId },
            data: { soldSeats: { increment: ticket.quantity } },
          });
        }
      }
    });

    console.log(`[MPesa Callback] ✅ Payment confirmed: ${parsed.mpesaRef}`);
  } else {
    // ── Payment failed / cancelled ────────────────────────────────────────────
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        resultCode: parsed.resultCode,
        resultDesc: parsed.resultDesc,
      },
    });

    console.log(`[MPesa Callback] ❌ Payment failed: ${parsed.resultDesc}`);
  }

  // Always respond 200 to Safaricom
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
