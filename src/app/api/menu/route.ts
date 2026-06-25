import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, rateLimit, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";
import { demoMenuItems, menuSeedData } from "@/lib/fallback-data";

const limiter = rateLimit(60_000, 60);

const categories = ["GRILL", "DRINKS", "SPECIALS", "SEAFOOD", "STARTERS", "DESSERTS"] as const;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = limiter(req);
  if (limited) return limited;

  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category")?.toUpperCase();
  const featured = searchParams.get("featured");
  const available = searchParams.get("available");

  try {
    if (category && !categories.includes(category as (typeof categories)[number])) {
      return NextResponse.json({ success: false, error: "Unknown menu category" }, { status: 422 });
    }

    const where = {
      ...(category ? { category: category as (typeof categories)[number] } : {}),
      ...(featured === "true" ? { isFeatured: true } : {}),
      ...(available !== "false" ? { isAvailable: true } : {}),
    };

    let items = await prisma.menuItem.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
    });

    if (items.length === 0 && !category && featured !== "true") {
      await prisma.menuItem.createMany({ data: menuSeedData(), skipDuplicates: true });
      items = await prisma.menuItem.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
      });
    }

    return NextResponse.json({
      success: true,
      data: items.length > 0 ? items : demoMenuItems,
    });
  } catch (error) {
    console.error("[Menu GET]", error);
    const fallback = demoMenuItems.filter((item) => {
      if (category && item.category !== category) return false;
      if (featured === "true" && !item.isFeatured) return false;
      if (available !== "false" && !item.isAvailable) return false;
      return true;
    });
    return NextResponse.json({ success: true, data: fallback, fallback: true });
  }
}

const createMenuSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(5).max(300),
  price: z.number().int().positive(),
  category: z.enum(categories),
  imageUrl: z.string().url().optional().nullable(),
  emoji: z.string().max(8).default("FB"),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
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

    const parsed = createMenuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const item = await prisma.menuItem.create({ data: parsed.data });

    await logActivity({
      userId: req.user.sub,
      action: "CREATE_MENU_ITEM",
      resource: "menu_items",
      resourceId: item.id,
      details: { name: item.name },
      req,
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  },
  ["ADMIN"]
);
