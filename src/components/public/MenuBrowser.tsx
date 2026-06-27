"use client";

import Image from "next/image";
import { Plus, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MenuCard } from "@/components/public/MenuCard";
import type { DemoLiquorItem } from "@/lib/fallback-data";
import { formatKES } from "@/lib/utils";
import { labelFromEnum } from "@/lib/visuals";
import { useCartStore } from "@/store/cartStore";
import type { MenuCategory, MenuItem } from "@/types";

const CATEGORY_ORDER: MenuCategory[] = [
  "GRILL",
  "SEAFOOD",
  "SPECIALS",
  "STARTERS",
  "DRINKS",
  "DESSERTS",
];

const LIQUOR_GROUPS = ["BEERS", "SPIRITS", "WINES", "COCKTAILS"] as const;
type BrowserCategory = "ALL" | MenuCategory | "BAR";

export function MenuBrowser({
  items,
  liquorItems = [],
}: {
  items: MenuItem[];
  liquorItems?: DemoLiquorItem[];
}) {
  const [category, setCategory] = useState<BrowserCategory>("ALL");
  const [query, setQuery] = useState("");
  const isBar = category === "BAR";

  const counts = useMemo(() => {
    const map = new Map<MenuCategory, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const categoryMatches = category === "ALL" || (category !== "BAR" && item.category === category);
      const searchMatches =
        !normalized ||
        item.name.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized);
      return categoryMatches && searchMatches;
    });
  }, [category, items, query]);

  const filteredLiquor = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return liquorItems.filter((item) => {
      if (!normalized) return true;
      return (
        item.name.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized) ||
        item.liquorCategory.toLowerCase().includes(normalized)
      );
    });
  }, [liquorItems, query]);

  const shownCount = isBar ? filteredLiquor.length : filtered.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <label className="relative block">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes, drinks, and specials"
            className="h-11 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </label>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <SlidersHorizontal size={15} />
          {shownCount} item{shownCount === 1 ? "" : "s"} shown
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCategory("ALL")}
          className={tabClass(category === "ALL")}
        >
          All
          <span className="ml-1 text-[11px] opacity-70">{items.length}</span>
        </button>
        {CATEGORY_ORDER.filter((value) => counts.has(value)).map((value) => (
          <button
            key={value}
            onClick={() => setCategory(value)}
            className={tabClass(category === value)}
          >
            {labelFromEnum(value)}
            <span className="ml-1 text-[11px] opacity-70">{counts.get(value)}</span>
          </button>
        ))}
        <button
          onClick={() => setCategory("BAR")}
          className={barTabClass(category === "BAR")}
        >
          Bar & Spirits
          <span className="ml-1 text-[11px] opacity-70">{liquorItems.length}</span>
        </button>
      </div>

      {isBar ? (
        <LiquorSection items={filteredLiquor} />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-950 dark:text-white">No matching menu items</p>
          <p className="mt-1 text-sm text-zinc-500">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function LiquorSection({ items }: { items: DemoLiquorItem[] }) {
  return (
    <section className="overflow-hidden rounded-lg bg-zinc-950 text-white shadow-xl ring-1 ring-zinc-800">
      <div className="border-b border-zinc-800 px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              Premium bar menu
            </p>
            <h2 className="mt-2 text-xl font-semibold">Bar & Spirits</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
            <ShieldCheck size={14} />
            18+ Only
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-white">No matching bar items</p>
          <p className="mt-1 text-sm text-zinc-400">Try another search term.</p>
        </div>
      ) : (
        <div className="space-y-8 px-4 py-5 sm:px-5">
          {LIQUOR_GROUPS.map((group) => {
            const groupItems = items.filter((item) => item.liquorCategory === group);
            if (groupItems.length === 0) return null;

            return (
              <div key={group}>
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
                    {labelFromEnum(group)}
                  </h3>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {groupItems.map((item) => (
                    <LiquorCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LiquorCard({ item }: { item: DemoLiquorItem }) {
  const { addItem } = useCartStore();

  function handleAdd() {
    addItem(item);
    toast.success(`${item.name} added to cart`, { duration: 1500 });
  }

  return (
    <article className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition hover:-translate-y-0.5 hover:border-amber-400/60">
      <div className="relative h-40 overflow-hidden bg-zinc-800">
        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover opacity-85 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
        )}
        <div className="absolute left-3 top-3 rounded-full bg-zinc-950/85 px-2.5 py-1 text-[11px] font-medium text-amber-200 shadow-sm backdrop-blur">
          {labelFromEnum(item.liquorCategory)}
        </div>
        <div className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-900">
          {item.serveSize}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold text-white">{item.name}</h3>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-zinc-400">
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-amber-300">{formatKES(item.price)}</span>
          <button
            onClick={handleAdd}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-medium text-zinc-950 transition hover:bg-amber-400"
            aria-label={`Add ${item.name} to cart`}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>
    </article>
  );
}

function tabClass(active: boolean) {
  return [
    "h-9 shrink-0 rounded-lg border px-3 text-sm font-medium transition",
    active
      ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white",
  ].join(" ");
}

function barTabClass(active: boolean) {
  return [
    "h-9 shrink-0 rounded-lg border px-3 text-sm font-medium transition",
    active
      ? "border-zinc-950 bg-zinc-950 text-amber-200 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white",
  ].join(" ");
}
