import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

// ─── GET /api/orders/[id] ─────────────────────────────────────────────────────

export const GET = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        orderItems: {
          include: { menuItem: true },
        },
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Customers can only view their own orders
    const isStaff = ["ADMIN", "KITCHEN"].includes(req.user.role);
    if (!isStaff && order.userId !== req.user.sub) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: order });
  },
  ["CUSTOMER", "KITCHEN", "ADMIN"]
);

// ─── PATCH /api/orders/[id] ───────────────────────────────────────────────────
// Kitchen/Admin: update order status

const updateOrderSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"])
    .optional(),
  paymentStatus: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
});

// Valid status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Validate status transition
    if (parsed.data.status) {
      const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(parsed.data.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot transition from ${order.status} → ${parsed.data.status}`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: parsed.data,
      include: {
        orderItems: { include: { menuItem: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    await logActivity({
      userId: req.user.sub,
      action: "UPDATE_ORDER_STATUS",
      resource: "orders",
      resourceId: order.id,
      details: { from: order.status, to: parsed.data.status },
      req,
    });

    return NextResponse.json({ success: true, data: updated });
  },
  ["KITCHEN", "ADMIN", "RECEPTION"]
);
