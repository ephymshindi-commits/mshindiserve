"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { MenuCard } from "@/components/public/MenuCard";
import { labelFromEnum } from "@/lib/visuals";
import type { MenuCategory, MenuItem } from "@/types";

const CATEGORY_ORDER: MenuCategory[] = [
  "GRILL",
  "SEAFOOD",
  "SPECIALS",
  "STARTERS",
  "DRINKS",
  "DESSERTS",
];

export function MenuBrowser({ items }: { items: MenuItem[] }) {
  const [category, setCategory] = useState<"ALL" | MenuCategory>("ALL");
  const [query, setQuery] = useState("");

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
      const categoryMatches = category === "ALL" || item.category === category;
      const searchMatches =
        !normalized ||
        item.name.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized);
      return categoryMatches && searchMatches;
    });
  }, [category, items, query]);

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
          {filtered.length} item{filtered.length === 1 ? "" : "s"} shown
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
      </div>

      {filtered.length === 0 ? (
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

function tabClass(active: boolean) {
  return [
    "h-9 shrink-0 rounded-lg border px-3 text-sm font-medium transition",
    active
      ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-white",
  ].join(" ");
}
