import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { databaseErrorResponse } from "@/lib/api-errors";
import { rateLimit, withAuth, logActivity } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = rateLimit(60_000, 60);

const liquorCategories = [
  "WINE",
  "BEER",
  "WHISKEY",
  "VODKA",
  "GIN",
  "RUM",
  "TEQUILA",
  "BRANDY",
  "LIQUEUR",
  "CHAMPAGNE",
  "CIDER",
  "OTHER",
] as const;

const itemStatuses = ["ACTIVE", "INACTIVE"] as const;

const moneySchema = z.coerce
  .number()
  .nonnegative()
  .transform((value) => new Prisma.Decimal(value.toFixed(2)));

const createLiquorItemSchema = z.object({
  sku: z.string().min(2).max(40).transform((value) => value.trim().toUpperCase()),
  name: z.string().min(2).max(100).transform((value) => value.trim()),
  category: z.enum(liquorCategories),
  bottleSizeMl: z.coerce.number().int().positive(),
  costPrice: moneySchema,
  retailPrice: moneySchema,
  currentStock: z.coerce.number().nonnegative().default(0),
  lowStockThreshold: z.coerce.number().nonnegative().default(5),
  status: z.enum(itemStatuses).default("ACTIVE"),
});

function serializeLiquorItem(item: any) {
  return {
    ...item,
    costPrice: item.costPrice?.toString(),
    retailPrice: item.retailPrice?.toString(),
  };
}

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    const limited = limiter(req);
    if (limited) return limited;

    try {
      const items = await prisma.liquorItem.findMany({
        orderBy: [{ status: "asc" }, { name: "asc" }],
        include: {
          transactions: {
            take: 6,
            orderBy: { timestamp: "desc" },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: items.map(serializeLiquorItem),
      });
    } catch (error) {
      const dbResponse = databaseErrorResponse(error);
      if (dbResponse) return dbResponse;

      console.error("[Liquor GET]", error);
      return NextResponse.json(
        { success: false, error: "Could not load liquor inventory." },
        { status: 500 }
      );
    }
  },
  ["ADMIN"]
);

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

    const parsed = createLiquorItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    try {
      const item = await prisma.liquorItem.create({
        data: parsed.data,
      });

      await logActivity({
        userId: req.user.sub,
        action: "CREATE_LIQUOR_ITEM",
        resource: "liquor_items",
        resourceId: item.id,
        details: { sku: item.sku, name: item.name },
        req,
      });

      return NextResponse.json(
        { success: true, data: serializeLiquorItem(item) },
        { status: 201 }
      );
    } catch (error) {
      const dbResponse = databaseErrorResponse(error);
      if (dbResponse) return dbResponse;

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json(
          { success: false, error: "A liquor item with that SKU already exists." },
          { status: 409 }
        );
      }

      console.error("[Liquor POST]", error);
      return NextResponse.json(
        { success: false, error: "Could not create liquor item." },
        { status: 500 }
      );
    }
  },
  ["ADMIN"]
);
