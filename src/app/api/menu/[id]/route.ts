import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories = ["GRILL", "DRINKS", "SPECIALS", "SEAFOOD", "STARTERS", "DESSERTS"] as const;

const updateMenuSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().min(5).max(300).optional(),
  price: z.number().positive().optional(),
  category: z.enum(categories).optional(),
  imageUrl: z.string().url().nullable().optional(),
  emoji: z.string().max(8).optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type RouteContext = { params: { id: string } };

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteContext) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateMenuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const { price, ...rest } = parsed.data;
    const item = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(price !== undefined ? { price: Math.round(price * 100) } : {}),
      },
    });

    await logActivity({
      userId: req.user.sub,
      action: "UPDATE_MENU_ITEM",
      resource: "menu_items",
      resourceId: item.id,
      details: { name: item.name },
      req,
    });

    return NextResponse.json({ success: true, data: item });
  },
  ["ADMIN"]
);

export const DELETE = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteContext) => {
    const orderItemCount = await prisma.orderItem.count({ where: { menuItemId: params.id } });

    if (orderItemCount > 0) {
      const item = await prisma.menuItem.update({
        where: { id: params.id },
        data: { isAvailable: false },
      });

      await logActivity({
        userId: req.user.sub,
        action: "SOFT_DELETE_MENU_ITEM",
        resource: "menu_items",
        resourceId: item.id,
        details: { name: item.name, orderItemCount },
        req,
      });

      return NextResponse.json({ success: true, data: item, softDeleted: true });
    }

    const item = await prisma.menuItem.delete({ where: { id: params.id } });

    await logActivity({
      userId: req.user.sub,
      action: "DELETE_MENU_ITEM",
      resource: "menu_items",
      resourceId: item.id,
      details: { name: item.name },
      req,
    });

    return NextResponse.json({ success: true, data: item, softDeleted: false });
  },
  ["ADMIN"]
);
