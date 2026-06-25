import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getOrders() {
  try {
    return await prisma.order.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } },
        orderItems: {
          include: { menuItem: { select: { name: true } } },
        },
      },
    });
  } catch (error) {
    console.error("[Admin Orders]", error);
    return [];
  }
}

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  return (
    <div>
      <AdminSectionHeader
        title="Orders"
        description="Monitor food orders and move them through the kitchen workflow."
      />
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <AdminOrdersTable orders={JSON.parse(JSON.stringify(orders))} />
      </div>
    </div>
  );
}
