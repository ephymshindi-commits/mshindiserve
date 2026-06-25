import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { demoMenuItems, menuSeedData } from "@/lib/fallback-data";
import { prisma } from "@/lib/prisma";
import { formatKES } from "@/lib/utils";
import { labelFromEnum } from "@/lib/visuals";

export const dynamic = "force-dynamic";

async function getMenuItems() {
  try {
    let items = await prisma.menuItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
    });
    if (items.length === 0) {
      await prisma.menuItem.createMany({ data: menuSeedData(), skipDuplicates: true });
      items = await prisma.menuItem.findMany({
        orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
      });
    }
    return items.length > 0 ? items : demoMenuItems;
  } catch (error) {
    console.error("[Admin Menu]", error);
    return demoMenuItems;
  }
}

export default async function AdminMenuPage() {
  const items = await getMenuItems();

  return (
    <div>
      <AdminSectionHeader
        title="Menu"
        description="Review menu availability, categories, pricing, and featured dishes."
      />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-950">
              <th className="px-4 py-3 text-xs font-medium text-zinc-500">Item</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500">Category</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500">Price</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-800/70">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-950 dark:text-white">{item.name}</p>
                  <p className="mt-1 max-w-xl text-xs text-zinc-500">{item.description}</p>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                  {labelFromEnum(item.category)}
                </td>
                <td className="px-4 py-3 font-medium text-amber-700 dark:text-amber-400">
                  {formatKES(item.price)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {item.isAvailable ? "Available" : "Hidden"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
