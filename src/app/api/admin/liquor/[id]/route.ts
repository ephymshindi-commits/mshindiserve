import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { databaseErrorResponse } from "@/lib/api-errors";
import { logActivity, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const liquorPatchSchema = z.object({
  imageUrl: z.string().url().nullable().optional(),
});

function serializeLiquorItem(item: any) {
  return {
    ...item,
    costPrice: item.costPrice?.toString(),
    retailPrice: item.retailPrice?.toString(),
    transactions: item.transactions ?? [],
  };
}

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = liquorPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    try {
      const item = await prisma.liquorItem.update({
        where: { id: params.id },
        data: parsed.data,
      });

      await logActivity({
        userId: req.user.sub,
        action: "UPDATE_LIQUOR_ITEM",
        resource: "liquor_items",
        resourceId: item.id,
        details: { sku: item.sku, name: item.name, imageUpdated: "imageUrl" in parsed.data },
        req,
      });

      return NextResponse.json({ success: true, data: serializeLiquorItem(item) });
    } catch (error) {
      const dbResponse = databaseErrorResponse(error);
      if (dbResponse) return dbResponse;

      console.error("[Liquor PATCH]", error);
      return NextResponse.json(
        { success: false, error: "Could not update liquor item." },
        { status: 500 }
      );
    }
  },
  ["ADMIN"]
);
