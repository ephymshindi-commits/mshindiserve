import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOptionalAuth, isGuestCheckoutUser } from "@/lib/guest-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const simulateSchema = z.object({
  orderId: z.string().min(1),
  phoneNumber: z.string().max(20).optional(),
});

function demoPaymentsEnabled() {
  return process.env.DEMO_MODE !== "false" && process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
}

function demoRef() {
  return `DEMO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
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
  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
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
        orderId: order.id,
        paymentStatus: order.paymentStatus,
        mpesaRef: order.mpesaRef ?? order.payment?.mpesaRef ?? null,
      },
    });
  }

  const mpesaRef = demoRef();
  const phoneNumber = parsed.data.phoneNumber?.replace(/\s/g, "") || "0700000000";

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
          checkoutRequestId: `SIM-${Date.now()}`,
          merchantRequestId: `SIM-MERCHANT-${Date.now()}`,
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
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      paymentStatus: updated.paymentStatus,
      mpesaRef: updated.mpesaRef,
    },
  });
}
