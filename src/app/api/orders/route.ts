import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, rateLimit, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";
import { menuSeedData } from "@/lib/fallback-data";

const limiter = rateLimit(60_000, 30);

const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;

export const dynamic = "force-dynamic";

function parseStatusFilter(status: string | null) {
  if (!status) return undefined;
  const values = status
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  const valid = values.filter((value): value is (typeof orderStatuses)[number] =>
    orderStatuses.includes(value as (typeof orderStatuses)[number])
  );

  return valid.length > 0 ? { in: valid } : undefined;
}

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    const limited = limiter(req);
    if (limited) return limited;

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20);
    const skip = (page - 1) * limit;
    const isStaff = ["ADMIN", "KITCHEN"].includes(req.user.role);
    const statusFilter = parseStatusFilter(searchParams.get("status"));

    const where = {
      ...(isStaff ? {} : { userId: req.user.sub }),
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          orderItems: {
            include: { menuItem: { select: { id: true, name: true, category: true, price: true } } },
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

const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
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

function newOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MS-${datePart}-${rand}`;
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

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const { items, tableNumber, isDelivery, deliveryAddr, notes } = parsed.data;
    const menuItemIds = Array.from(new Set(items.map((item) => item.menuItemId)));

    let menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      await prisma.menuItem.createMany({ data: menuSeedData(), skipDuplicates: true });
      menuItems = await prisma.menuItem.findMany({
        where: { id: { in: menuItemIds }, isAvailable: true },
      });
    }

    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more menu items are unavailable" },
        { status: 400 }
      );
    }

    const menuMap = new Map(menuItems.map((item) => [item.id, item]));
    const totalAmount = items.reduce((sum, item) => {
      const menuItem = menuMap.get(item.menuItemId);
      return sum + (menuItem?.price ?? 0) * item.quantity;
    }, 0);

    const order = await prisma.order.create({
      data: {
        orderNumber: newOrderNumber(),
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
        orderItems: { include: { menuItem: true } },
      },
    });

    await logActivity({
      userId: req.user.sub,
      action: "CREATE_ORDER",
      resource: "orders",
      resourceId: order.id,
      details: { orderNumber: order.orderNumber, totalAmount, itemCount: items.length },
      req,
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  },
  ["CUSTOMER", "ADMIN"]
);
