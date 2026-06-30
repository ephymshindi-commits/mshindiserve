"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2, Minus, Plus, RefreshCw, ShoppingBag, Wine, X } from "lucide-react";
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

type BarOrderResult = {
  reference: string;
  paymentStatus: "COMPLETED";
  tableNumber?: string | null;
  message?: string;
};

const categories: Array<"ALL" | LiquorCategory> = [
  "ALL",
  "BEER",
  "WINE",
  "WHISKEY",
  "VODKA",
  "GIN",
  "CIDER",
  "RUM",
  "BRANDY",
  "LIQUEUR",
  "CHAMPAGNE",
  "OTHER",
];

const fallbackBarItems: LiquorItem[] = [
  {
    id: "fallback-tusker-lager",
    sku: "BAR-FALLBACK-001",
    name: "Tusker Lager",
    category: "BEER",
    bottleSizeMl: 500,
    retailPrice: "350",
    imageUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=80",
    currentStock: 36,
    lowStockThreshold: 8,
    status: "ACTIVE",
  },
  {
    id: "fallback-guinness",
    sku: "BAR-FALLBACK-002",
    name: "Guinness Stout",
    category: "BEER",
    bottleSizeMl: 500,
    retailPrice: "450",
    imageUrl: "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&w=900&q=80",
    currentStock: 24,
    lowStockThreshold: 6,
    status: "ACTIVE",
  },
  {
    id: "fallback-savana",
    sku: "BAR-FALLBACK-003",
    name: "Savanna Dry Cider",
    category: "CIDER",
    bottleSizeMl: 330,
    retailPrice: "500",
    imageUrl: "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=900&q=80",
    currentStock: 18,
    lowStockThreshold: 5,
    status: "ACTIVE",
  },
  {
    id: "fallback-house-red",
    sku: "BAR-FALLBACK-004",
    name: "House Red Wine",
    category: "WINE",
    bottleSizeMl: 175,
    retailPrice: "850",
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80",
    currentStock: 14,
    lowStockThreshold: 4,
    status: "ACTIVE",
  },
  {
    id: "fallback-house-white",
    sku: "BAR-FALLBACK-005",
    name: "Crisp House White",
    category: "WINE",
    bottleSizeMl: 175,
    retailPrice: "850",
    imageUrl: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&w=900&q=80",
    currentStock: 12,
    lowStockThreshold: 4,
    status: "ACTIVE",
  },
  {
    id: "fallback-jameson",
    sku: "BAR-FALLBACK-006",
    name: "Jameson Irish Whiskey",
    category: "WHISKEY",
    bottleSizeMl: 35,
    retailPrice: "800",
    imageUrl: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=900&q=80",
    currentStock: 22,
    lowStockThreshold: 6,
    status: "ACTIVE",
  },
  {
    id: "fallback-jw-black",
    sku: "BAR-FALLBACK-007",
    name: "Johnnie Walker Black Label",
    category: "WHISKEY",
    bottleSizeMl: 35,
    retailPrice: "950",
    imageUrl: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=900&q=80",
    currentStock: 15,
    lowStockThreshold: 5,
    status: "ACTIVE",
  },
  {
    id: "fallback-gilbeys",
    sku: "BAR-FALLBACK-008",
    name: "Gilbey's Gin",
    category: "GIN",
    bottleSizeMl: 35,
    retailPrice: "550",
    imageUrl: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=900&q=80",
    currentStock: 20,
    lowStockThreshold: 5,
    status: "ACTIVE",
  },
  {
    id: "fallback-mojito",
    sku: "BAR-FALLBACK-009",
    name: "Classic Mojito",
    category: "RUM",
    bottleSizeMl: 300,
    retailPrice: "1100",
    imageUrl: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=900&q=80",
    currentStock: 16,
    lowStockThreshold: 4,
    status: "ACTIVE",
  },
  {
    id: "fallback-dawa",
    sku: "BAR-FALLBACK-010",
    name: "Dawa Cocktail",
    category: "VODKA",
    bottleSizeMl: 300,
    retailPrice: "950",
    imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80",
    currentStock: 18,
    lowStockThreshold: 4,
    status: "ACTIVE",
  },
];

function fallbackItemsFor(nextCategory: "ALL" | LiquorCategory) {
  if (nextCategory === "ALL") return fallbackBarItems;
  return fallbackBarItems.filter((item) => item.category === nextCategory);
}

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
  const [orderingItem, setOrderingItem] = useState<LiquorItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [tableNumber, setTableNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<BarOrderResult | null>(null);

  async function loadItems(nextCategory = category, quiet = false) {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const params = nextCategory === "ALL" ? "" : `?category=${nextCategory}`;
      const res = await fetch(`/api/liquor${params}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Could not load bar menu.");
      const data = (payload.data ?? []) as LiquorItem[];
      setItems(data.length > 0 ? data : fallbackItemsFor(nextCategory));
    } catch (error) {
      setItems(fallbackItemsFor(nextCategory));
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableFromUrl = params.get("table");
    const storedTable = window.localStorage.getItem("ms-table-number");
    const nextTable = tableFromUrl || storedTable || "";
    if (nextTable) setTableNumber(nextTable);
  }, []);

  const filteredCategories = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    return categories.filter((item) => item === "ALL" || present.has(item));
  }, [items]);

  const orderTotal = orderingItem ? Number(orderingItem.retailPrice) * quantity : 0;
  const maxQuantity = Math.max(1, Math.min(20, Math.floor(orderingItem?.currentStock ?? 1)));

  function openOrder(item: LiquorItem) {
    setOrderingItem(item);
    setQuantity(1);
    setOrderResult(null);
  }

  function closeOrder() {
    setOrderingItem(null);
    setQuantity(1);
    setOrderLoading(false);
    setOrderResult(null);
  }

  async function submitBarOrder() {
    if (!orderingItem) return;

    const normalizedTable = tableNumber.trim();
    if (!normalizedTable) {
      toast.error("Enter the table number");
      return;
    }

    const normalizedPhone = phoneNumber.replace(/\s/g, "");
    if (normalizedPhone && !/^(\+254|0)[17]\d{8}$/.test(normalizedPhone)) {
      toast.error("Enter a valid Safaricom number or leave phone empty");
      return;
    }

    setOrderLoading(true);
    try {
      window.localStorage.setItem("ms-table-number", normalizedTable);

      const res = await fetch("/api/liquor/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: orderingItem.id,
          quantity,
          tableNumber: normalizedTable,
          phoneNumber: normalizedPhone || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "Could not place bar order.");
      }

      const data = payload.data;
      setOrderResult({
        reference: data.reference,
        paymentStatus: "COMPLETED",
        tableNumber: data.tableNumber,
        message: data.message ?? "Bar order sent to the team.",
      });

      if (data.item) {
        setItems((current) =>
          current.map((item) => (item.id === data.item.id ? { ...item, ...data.item } : item))
        );
      } else if (orderingItem.id.startsWith("fallback-")) {
        setItems((current) =>
          current.map((item) =>
            item.id === orderingItem.id
              ? { ...item, currentStock: Math.max(0, item.currentStock - quantity) }
              : item
          )
        );
      }

      if (!orderingItem.id.startsWith("fallback-")) {
        void loadItems(category, true);
      }

      toast.success("Bar order completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place bar order.");
    } finally {
      setOrderLoading(false);
    }
  }

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
                      <p className="mt-1 text-sm text-zinc-500">
                        {item.bottleSizeMl >= 100
                          ? `${item.bottleSizeMl}ml bottle`
                          : `${item.bottleSizeMl}ml pour`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">From</p>
                      <p className="text-lg font-semibold text-zinc-950 dark:text-white">
                        {money(item.retailPrice)}
                      </p>
                    </div>
                    <button
                      onClick={() => openOrder(item)}
                      disabled={item.currentStock <= 0}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                      <ShoppingBag size={15} />
                      Order
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog.Root open={Boolean(orderingItem)} onOpenChange={(open) => !open && closeOrder()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-5 shadow-2xl dark:bg-zinc-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-base font-semibold text-zinc-950 dark:text-white">
                  {orderResult ? "Bar order complete" : orderingItem?.name}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-zinc-500">
                  {orderResult
                    ? "Your drink order has been logged for the team."
                    : "Choose quantity and table number to complete the order."}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            {orderResult ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle2 size={26} />
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-xs text-zinc-500">Reference</p>
                  <p className="mt-1 font-mono text-lg font-bold tracking-widest text-amber-700 dark:text-amber-400">
                    {orderResult.reference}
                  </p>
                  <p className="mt-2 text-xs font-medium text-zinc-500">
                    Table: {orderResult.tableNumber ?? tableNumber}
                  </p>
                </div>
                {orderResult.message ? (
                  <p className="text-sm leading-6 text-zinc-500">{orderResult.message}</p>
                ) : null}
                <button
                  onClick={closeOrder}
                  className="h-11 w-full rounded-lg bg-zinc-950 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                        {orderingItem?.name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {orderingItem ? label(orderingItem.category) : "Bar item"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      {orderingItem ? money(orderingItem.retailPrice) : money(0)}
                    </p>
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-zinc-500">Quantity</span>
                  <div className="mt-1.5 flex h-11 items-center justify-between rounded-lg border border-zinc-200 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-800">
                    <button
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      type="button"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-sm font-semibold text-zinc-950 dark:text-white">{quantity}</span>
                    <button
                      onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      type="button"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-zinc-500">Table number</span>
                  <input
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value)}
                    placeholder="e.g. 7"
                    className="mt-1.5 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-zinc-500">Phone number (optional)</span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="+254 712 345 678"
                    className="mt-1.5 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
                  <span className="text-zinc-500">Total</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {money(orderTotal)}
                  </span>
                </div>

                <button
                  onClick={submitBarOrder}
                  disabled={orderLoading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {orderLoading ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
                  {orderLoading ? "Completing" : "Simulate bar order"}
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
