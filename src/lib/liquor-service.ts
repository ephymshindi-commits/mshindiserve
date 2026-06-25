import { Prisma, type LiquorOutlet, type LiquorTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class LiquorInventoryError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "LiquorInventoryError";
  }
}

function assertPositiveQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new LiquorInventoryError("Quantity must be greater than zero.", 422);
  }
}

function parseOutlet(outlet: string): LiquorOutlet {
  if (outlet === "RESTAURANT" || outlet === "BAR") return outlet;
  throw new LiquorInventoryError("Invalid outlet. Use RESTAURANT or BAR.", 422);
}

export async function processLiquorSale(
  itemId: string,
  quantity: number,
  outlet: string,
  userId?: string
) {
  assertPositiveQuantity(quantity);
  const normalizedOutlet = parseOutlet(outlet);

  return prisma.$transaction(
    async (tx) => {
      const item = await tx.liquorItem.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          status: true,
          currentStock: true,
          lowStockThreshold: true,
          retailPrice: true,
        },
      });

      if (!item) throw new LiquorInventoryError("Liquor item not found.", 404);
      if (item.status !== "ACTIVE") {
        throw new LiquorInventoryError("Liquor item is inactive.", 409);
      }

      if (item.currentStock < quantity) {
        throw new LiquorInventoryError("Insufficient liquor stock.", 409);
      }

      /*
        Concurrency guard:
        The read above gives a clear business error, but this conditional update is
        the critical protection. PostgreSQL applies the decrement only when the row
        still has currentStock >= quantity at write time. If two restaurant/bar
        tills sell the same bottle at once, the first valid transaction decrements
        stock; the second transaction sees update count 0 and rolls back before a
        LiquorTransaction row is written. That prevents negative stock and keeps
        the transaction log consistent with inventory.
      */
      const updateResult = await tx.liquorItem.updateMany({
        where: {
          id: item.id,
          status: "ACTIVE",
          currentStock: { gte: quantity },
        },
        data: {
          currentStock: { decrement: quantity },
        },
      });

      if (updateResult.count !== 1) {
        throw new LiquorInventoryError(
          "Stock changed while processing this sale. Please retry.",
          409
        );
      }

      const updatedItem = await tx.liquorItem.findUniqueOrThrow({
        where: { id: item.id },
      });

      const transaction = await tx.liquorTransaction.create({
        data: {
          liquorItemId: item.id,
          type: "SALE",
          quantity,
          outlet: normalizedOutlet,
          userId,
          unitRetailPrice: item.retailPrice,
          totalAmount: item.retailPrice.mul(quantity),
          description: `Sale from ${normalizedOutlet.toLowerCase()}`,
        },
      });

      return {
        item: updatedItem,
        transaction,
        lowStockWarning: updatedItem.currentStock <= updatedItem.lowStockThreshold,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

export async function adjustLiquorStock(input: {
  itemId: string;
  type: Extract<LiquorTransactionType, "RESTOCK" | "WASTAGE" | "AUDIT">;
  quantity: number;
  outlet: string;
  userId?: string;
  description?: string;
}) {
  assertPositiveQuantity(input.quantity);
  const outlet = parseOutlet(input.outlet);

  return prisma.$transaction(
    async (tx) => {
      const item = await tx.liquorItem.findUnique({
        where: { id: input.itemId },
        select: { id: true, currentStock: true, status: true },
      });

      if (!item) throw new LiquorInventoryError("Liquor item not found.", 404);
      if (item.status !== "ACTIVE") {
        throw new LiquorInventoryError("Liquor item is inactive.", 409);
      }

      if (input.type === "RESTOCK") {
        await tx.liquorItem.update({
          where: { id: item.id },
          data: { currentStock: { increment: input.quantity } },
        });
      }

      if (input.type === "WASTAGE") {
        const updateResult = await tx.liquorItem.updateMany({
          where: { id: item.id, currentStock: { gte: input.quantity } },
          data: { currentStock: { decrement: input.quantity } },
        });

        if (updateResult.count !== 1) {
          throw new LiquorInventoryError("Cannot log wastage above available stock.", 409);
        }
      }

      if (input.type === "AUDIT") {
        await tx.liquorItem.update({
          where: { id: item.id },
          data: { currentStock: input.quantity },
        });
      }

      const updatedItem = await tx.liquorItem.findUniqueOrThrow({
        where: { id: item.id },
      });

      const transaction = await tx.liquorTransaction.create({
        data: {
          liquorItemId: item.id,
          type: input.type,
          quantity: input.quantity,
          outlet,
          userId: input.userId,
          description: input.description,
        },
      });

      return {
        item: updatedItem,
        transaction,
        lowStockWarning: updatedItem.currentStock <= updatedItem.lowStockThreshold,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}
