"use client";

import { Loader2, RefreshCw, Wine } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type LiquorCategory =
  | "WINE"
  | "BEER"
  | "WHISKEY"
  | "VODKA"
  | "GIN"
  | "RUM"
  | "TEQUILA"
  | "BRANDY"
  | "LIQUEUR"
  | "CHAMPAGNE"
  | "CIDER"
  | "OTHER";

type LiquorItem = {
  id: string;
  sku: string;
  name: string;
  category: LiquorCategory;
  bottleSizeMl: number;
  retailPrice: string;
  imageUrl: string | null;
  currentStock: number;
  lowStockThreshold: number;
  status: "ACTIVE" | "INACTIVE";
};

const categories: Array<"ALL" | LiquorCategory> = [
  "ALL",
  "BEER",
  "WINE",
  "WHISKEY",
  "VODKA",
  "GIN",
  "RUM",
  "BRANDY",
  "LIQUEUR",
  "CHAMPAGNE",
  "OTHER",
];

function label(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function money(value: string | number) {
  return `KES ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function availability(item: LiquorItem) {
  if (item.currentStock <= 0) return { label: "Out", className: "bg-red-50 text-red-700" };
  if (item.currentStock <= item.lowStockThreshold) {
    return { label: "Few left", className: "bg-amber-50 text-amber-700" };
  }
  return { label: "Available", className: "bg-emerald-50 text-emerald-700" };
}

export function BarBrowser() {
  const [items, setItems] = useState<LiquorItem[]>([]);
  const [category, setCategory] = useState<"ALL" | LiquorCategory>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadItems(nextCategory = category, quiet = false) {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const params = nextCategory === "ALL" ? "" : `?category=${nextCategory}`;
      const res = await fetch(`/api/liquor${params}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Could not load bar menu.");
      setItems(payload.data);
    } catch (error) {
      if (!quiet) {
        toast.error(error instanceof Error ? error.message : "Could not load bar menu.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadItems(category);
    const interval = window.setInterval(() => loadItems(category, true), 15000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const filteredCategories = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    return categories.filter((item) => item === "ALL" || present.has(item));
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filteredCategories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={cn(
                "h-9 shrink-0 rounded-lg px-3 text-xs font-medium transition",
                category === item
                  ? "bg-amber-600 text-white"
                  : "bg-white text-zinc-600 hover:bg-amber-50 hover:text-amber-700 dark:bg-zinc-900 dark:text-zinc-300"
              )}
            >
              {item === "ALL" ? "All" : label(item)}
            </button>
          ))}
        </div>
        <button
          onClick={() => loadItems(category, true)}
          disabled={refreshing}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Live stock
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-lg bg-white dark:bg-zinc-900" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Wine size={32} className="mx-auto text-zinc-300" />
          <h2 className="mt-4 text-base font-semibold text-zinc-950 dark:text-white">
            Bar selection is being updated
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Please check again shortly or ask our team for today&apos;s pour list.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const status = availability(item);
            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="relative h-44 bg-zinc-100 dark:bg-zinc-800">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-300">
                      <Wine size={34} />
                    </div>
                  )}
                  <span className={cn("absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium", status.className)}>
                    {status.label}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
                        {label(item.category)}
                      </p>
                      <h2 className="mt-2 text-base font-semibold text-zinc-950 dark:text-white">
                        {item.name}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-500">{item.bottleSizeMl}ml bottle</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">From</p>
                      <p className="text-lg font-semibold text-zinc-950 dark:text-white">
                        {money(item.retailPrice)}
                      </p>
                    </div>
                    <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-950">
                      Ask at bar or restaurant
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
