import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth, rateLimit, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

const limiter = rateLimit(60_000, 60);

// ─── GET /api/menu ────────────────────────────────────────────────────────────
// Public — no auth required

export async function GET(req: NextRequest) {
  const limited = limiter(req);
  if (limited) return limited;

  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const available = searchParams.get("available");

  const items = await prisma.menuItem.findMany({
    where: {
      ...(category ? { category: category.toUpperCase() as any } : {}),
      ...(featured === "true" ? { isFeatured: true } : {}),
      ...(available !== "false" ? { isAvailable: true } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ success: true, data: items });
}

// ─── POST /api/menu ───────────────────────────────────────────────────────────
// Admin only

const createMenuSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(5).max(300),
  price: z.number().int().positive(), // in KES cents
  category: z.enum(["GRILL", "DRINKS", "SPECIALS", "SEAFOOD", "STARTERS", "DESSERTS"]),
  imageUrl: z.string().url().optional(),
  emoji: z.string().max(4).default("🍽️"),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
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
