import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseErrorResponse } from "@/lib/api-errors";
import { adjustLiquorStock, LiquorInventoryError, processLiquorSale } from "@/lib/liquor-service";
import { logActivity, rateLimit, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = rateLimit(60_000, 60);

const transactionSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["SALE", "RESTOCK", "WASTAGE", "AUDIT"]),
  quantity: z.coerce.number().positive(),
  outlet: z.enum(["RESTAURANT", "BAR"]),
  description: z.string().max(300).optional(),
});

function serializeResult(result: Awaited<ReturnType<typeof processLiquorSale>>) {
  return {
    ...result,
    item: {
      ...result.item,
      costPrice: result.item.costPrice.toString(),
      retailPrice: result.item.retailPrice.toString(),
    },
  };
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

    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    try {
      const { itemId, type, quantity, outlet, description } = parsed.data;
      const result =
        type === "SALE"
          ? await processLiquorSale(itemId, quantity, outlet, req.user.sub)
          : await adjustLiquorStock({
              itemId,
              type,
              quantity,
              outlet,
              userId: req.user.sub,
              description,
            });

      await logActivity({
        userId: req.user.sub,
        action: `${type}_LIQUOR_STOCK`,
        resource: "liquor_items",
        resourceId: itemId,
        details: { quantity, outlet, lowStockWarning: result.lowStockWarning },
        req,
      });

      return NextResponse.json({ success: true, data: serializeResult(result) });
    } catch (error) {
      if (error instanceof LiquorInventoryError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.status }
        );
      }

      const dbResponse = databaseErrorResponse(error);
      if (dbResponse) return dbResponse;

      console.error("[Liquor Transaction]", error);
      return NextResponse.json(
        { success: false, error: "Could not process liquor transaction." },
        { status: 500 }
      );
    }
  },
  ["ADMIN"]
);
