import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { databaseErrorResponse } from "@/lib/api-errors";
import { rateLimit } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = rateLimit(60_000, 80);

const categories = [
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

function serializeItem(item: any) {
  return {
    ...item,
    costPrice: undefined,
    retailPrice: item.retailPrice?.toString(),
  };
}

export async function GET(req: NextRequest) {
  const limited = limiter(req);
  if (limited) return limited;

  const category = req.nextUrl.searchParams.get("category")?.toUpperCase();

  if (category && !categories.includes(category as (typeof categories)[number])) {
    return NextResponse.json({ success: false, error: "Unknown liquor category" }, { status: 422 });
  }

  try {
    const items = await prisma.liquorItem.findMany({
      where: {
        status: "ACTIVE",
        currentStock: { gt: 0 },
        ...(category ? { category: category as (typeof categories)[number] } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: items.map(serializeItem),
    });
  } catch (error) {
    const dbResponse = databaseErrorResponse(error);
    if (dbResponse) return dbResponse;

    console.error("[Liquor Public GET]", error);
    return NextResponse.json(
      { success: false, error: "Could not load bar menu." },
      { status: 500 }
    );
  }
}
