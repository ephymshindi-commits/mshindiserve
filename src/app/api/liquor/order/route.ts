import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { databaseErrorResponse } from "@/lib/api-errors";
import { getOptionalAuth, getOrCreateGuestUser } from "@/lib/guest-checkout";
import { LiquorInventoryError, processLiquorSale } from "@/lib/liquor-service";
import { logActivity, rateLimit } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = rateLimit(60_000, 40);

const orderSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
  tableNumber: z.string().trim().min(1).max(20).optional(),
  phoneNumber: z.string().trim().max(20).optional(),
});

function demoRef() {
  return `BAR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function serializeResult(result: Awaited<ReturnType<typeof processLiquorSale>>) {
  return {
    ...result,
    item: {
      ...result.item,
      costPrice: result.item.costPrice.toString(),
      retailPrice: result.item.retailPrice.toString(),
    },
    transaction: {
      ...result.transaction,
      unitRetailPrice: result.transaction.unitRetailPrice?.toString() ?? null,
      totalAmount: result.transaction.totalAmount?.toString() ?? null,
    },
  };
}

export async function POST(req: NextRequest) {
  const limited = limiter(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  const { itemId, quantity, tableNumber, phoneNumber } = parsed.data;
  const reference = demoRef();

  if (itemId.startsWith("fallback-")) {
    return NextResponse.json({
      success: true,
      data: {
        reference,
        demoMode: true,
        paymentStatus: "COMPLETED",
        tableNumber: tableNumber ?? null,
        message: "Demo bar order accepted.",
      },
    });
  }

  try {
    const authUser = await getOptionalAuth(req);
    const guestUser = authUser ? null : await getOrCreateGuestUser();
    const userId = authUser?.sub ?? guestUser!.id;

    const description = [
      "Public bar order",
      tableNumber ? `table ${tableNumber}` : null,
      phoneNumber ? `phone ${phoneNumber}` : null,
      `ref ${reference}`,
    ]
      .filter(Boolean)
      .join(" - ");

    const result = await processLiquorSale(itemId, quantity, "BAR", userId, description);
    const data = serializeResult(result);

    await logActivity({
      userId,
      action: "CREATE_BAR_ORDER",
      resource: "liquor_items",
      resourceId: itemId,
      details: {
        quantity,
        tableNumber,
        phoneNumber,
        reference,
        lowStockWarning: result.lowStockWarning,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        reference,
        paymentStatus: "COMPLETED",
        tableNumber: tableNumber ?? null,
      },
    });
  } catch (error) {
    if (error instanceof LiquorInventoryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    const dbResponse = databaseErrorResponse(error);
    if (dbResponse) return dbResponse;

    console.error("[Liquor Public Order]", error);
    return NextResponse.json(
      { success: false, error: "Could not place bar order." },
      { status: 500 }
    );
  }
}
