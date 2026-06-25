import { MenuBrowser } from "@/components/public/MenuBrowser";
import { demoMenuItems, menuSeedData } from "@/lib/fallback-data";
import { prisma } from "@/lib/prisma";
import type { MenuItem } from "@/types";

export const dynamic = "force-dynamic";

async function getMenuItems(): Promise<MenuItem[]> {
  try {
    let items = await prisma.menuItem.findMany({
      where: { isAvailable: true },
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
    });

    if (items.length === 0) {
      await prisma.menuItem.createMany({ data: menuSeedData(), skipDuplicates: true });
      items = await prisma.menuItem.findMany({
        where: { isAvailable: true },
        orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
      });
    }

    return JSON.parse(JSON.stringify(items.length > 0 ? items : demoMenuItems));
  } catch (error) {
    console.error("[Menu Page]", error);
    return demoMenuItems;
  }
}

export default async function MenuPage() {
  const items = await getMenuItems();

  return (
    <div className="bg-stone-50 pb-16 dark:bg-zinc-950">
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
              Kitchen open daily
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
              Order food from Fine Breeze
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Browse grill favorites, coastal seafood, house cocktails, starters, and desserts.
              Add dishes to your cart and check out securely with M-Pesa.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Items", items.length],
                ["Payment", "M-Pesa"],
                ["Kitchen", "Live"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white p-3 dark:bg-zinc-950">
                  <p className="text-lg font-semibold text-zinc-950 dark:text-white">{value}</p>
                  <p className="text-xs text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <MenuBrowser items={items} />
      </section>
    </div>
  );
}
