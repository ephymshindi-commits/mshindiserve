import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, rateLimit, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

const limiter = rateLimit(60_000, 30);

// ─── GET /api/orders ──────────────────────────────────────────────────────────
// ADMIN/KITCHEN: all orders | CUSTOMER: their own orders

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    const limited = limiter(req);
    if (limited) return limited;

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const isStaff = ["ADMIN", "KITCHEN"].includes(req.user.role);

    const where = {
      ...(isStaff ? {} : { userId: req.user.sub }),
      ...(status ? { status: status.toUpperCase() as any } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          orderItems: {
            include: { menuItem: { select: { id: true, name: true, emoji: true, price: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      total,
      page,
      limit,
      hasMore: skip + orders.length < total,
    });
  },
  ["CUSTOMER", "KITCHEN", "ADMIN"]
);

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// CUSTOMER: place a new order

const orderItemSchema = z.object({
  menuItemId: z.string().cuid(),
  quantity: z.number().int().min(1).max(20),
  notes: z.string().max(200).optional(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  tableNumber: z.string().max(10).optional(),
  isDelivery: z.boolean().default(false),
  deliveryAddr: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
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

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const { items, tableNumber, isDelivery, deliveryAddr, notes } = parsed.data;

    // Validate all menu items exist & are available
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more menu items are unavailable" },
        { status: 400 }
      );
    }

    // Calculate total
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));
    const totalAmount = items.reduce((sum, item) => {
      const menuItem = menuMap.get(item.menuItemId)!;
      return sum + menuItem.price * item.quantity;
    }, 0);

    // Generate order number: MS-YYYYMMDD-XXXX
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `MS-${datePart}-${rand}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: req.user.sub,
        totalAmount,
        tableNumber,
        isDelivery,
        deliveryAddr,
        notes,
        status: "PENDING",
        orderItems: {
          create: items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: menuMap.get(item.menuItemId)!.price,
            notes: item.notes,
          })),
        },
      },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
      },
    });

    await logActivity({
      userId: req.user.sub,
      action: "CREATE_ORDER",
      resource: "orders",
      resourceId: order.id,
      details: { orderNumber, totalAmount, itemCount: items.length },
      req,
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  },
  ["CUSTOMER", "ADMIN"]
);
