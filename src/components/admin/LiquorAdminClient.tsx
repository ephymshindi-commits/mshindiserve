"use client";

import { AlertTriangle, ClipboardCheck, Loader2, Plus, RefreshCw, Wine } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/admin/ImageUpload";
import api from "@/lib/api";
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

type LiquorTransactionType = "SALE" | "RESTOCK" | "WASTAGE" | "AUDIT";
type LiquorOutlet = "RESTAURANT" | "BAR";
type LiquorItemStatus = "ACTIVE" | "INACTIVE";

type LiquorTransaction = {
  id: string;
  type: LiquorTransactionType;
  quantity: number;
  outlet: LiquorOutlet;
  unitRetailPrice: string | null;
  totalAmount: string | null;
  description: string | null;
  timestamp: string;
  liquorItem?: { id: string; name: string; sku: string; category: LiquorCategory } | null;
  user?: { name: string; email: string } | null;
};

type LiquorItem = {
  id: string;
  sku: string;
  name: string;
  category: LiquorCategory;
  bottleSizeMl: number;
  costPrice: string;
  retailPrice: string;
  imageUrl: string | null;
  currentStock: number;
  lowStockThreshold: number;
  status: LiquorItemStatus;
  createdAt: string;
  updatedAt: string;
  transactions: LiquorTransaction[];
};

type LiquorSummary = {
  allTimeSalesRevenue: number;
  allTimeUnitsSold: number;
  allTimeSaleCount: number;
  todaySalesRevenue: number;
  todayUnitsSold: number;
  todaySaleCount: number;
  recentTransactions: LiquorTransaction[];
  topItems: Array<{
    liquorItemId: string;
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
  }>;
};

const categories: LiquorCategory[] = [
  "WINE",
  "BEER",
  "WHISKEY",
  "VODKA",
  "GIN",
  "RUM",
  "TEQUILA",
  "BRANDY",
  "LIQUEUR",
  "CHAMPAGNE",
  "CIDER",
  "OTHER",
];

function money(value: number | string) {
  return `KES ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

function label(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stockStatus(item: LiquorItem) {
  if (item.currentStock <= 0) return "Out of Stock";
  if (item.currentStock <= item.lowStockThreshold) return "Low Stock";
  return "In Stock";
}

function statusClass(status: string) {
  if (status === "Out of Stock") return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  if (status === "Low Stock") return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
  return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
}

export function LiquorAdminClient() {
  const [items, setItems] = useState<LiquorItem[]>([]);
  const [summary, setSummary] = useState<LiquorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [photoItemId, setPhotoItemId] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);

  const [newItem, setNewItem] = useState({
    sku: "",
    name: "",
    category: "BEER" as LiquorCategory,
    bottleSizeMl: 500,
    costPrice: 0,
    retailPrice: 0,
    imageUrl: "",
    currentStock: 0,
    lowStockThreshold: 5,
    status: "ACTIVE" as LiquorItemStatus,
  });

  const [stockForm, setStockForm] = useState({
    itemId: "",
    type: "RESTOCK" as LiquorTransactionType,
    quantity: 1,
    outlet: "BAR" as LiquorOutlet,
    description: "",
  });

  async function loadItems(quiet = false) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/admin/liquor", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Could not load liquor inventory.");

      const loadedItems: LiquorItem[] = payload.data;
      setItems(loadedItems);
      setSummary(payload.summary ?? null);
      setStockForm((current) => ({
        ...current,
        itemId: current.itemId || loadedItems[0]?.id || "",
      }));
      setPhotoItemId((current) => current || loadedItems[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load liquor inventory.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadItems();
    const interval = window.setInterval(() => loadItems(true), 15000);
    return () => window.clearInterval(interval);
  }, []);

  async function createItem(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/admin/liquor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...newItem,
          imageUrl: newItem.imageUrl || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Could not create liquor item.");

      toast.success("Liquor item created.");
      setNewItem({
        sku: "",
        name: "",
        category: "BEER",
        bottleSizeMl: 500,
        costPrice: 0,
        retailPrice: 0,
        imageUrl: "",
        currentStock: 0,
        lowStockThreshold: 5,
        status: "ACTIVE",
      });
      await loadItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create liquor item.");
    } finally {
      setCreating(false);
    }
  }

  async function submitStockTransaction(event: React.FormEvent) {
    event.preventDefault();
    setAdjusting(true);

    try {
      const res = await fetch("/api/admin/liquor/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...stockForm,
          description: stockForm.description.trim() || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Could not update liquor stock.");

      toast.success(
        payload.data.lowStockWarning
          ? "Stock updated. This item is now below threshold."
          : "Stock updated."
      );
      setStockForm((current) => ({ ...current, quantity: 1, description: "" }));
      await loadItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update liquor stock.");
    } finally {
      setAdjusting(false);
    }
  }

  async function updateItemPhoto(itemId: string, imageUrl: string | null) {
    setSavingPhoto(true);
    try {
      const res = await api.patch(`/admin/liquor/${itemId}`, { imageUrl });
      if (!res.data?.success) {
        throw new Error(res.data?.error ?? "Could not update drink photo.");
      }

      toast.success(imageUrl ? "Drink photo updated." : "Drink photo removed.");
      await loadItems(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? "Could not update drink photo.");
    } finally {
      setSavingPhoto(false);
    }
  }

  const stats = useMemo(() => {
    const activeItems = items.filter((item) => item.status === "ACTIVE");
    return {
      active: activeItems.length,
      low: activeItems.filter((item) => stockStatus(item) === "Low Stock").length,
      out: activeItems.filter((item) => stockStatus(item) === "Out of Stock").length,
      retailValue: activeItems.reduce(
        (sum, item) => sum + item.currentStock * Number(item.retailPrice),
        0
      ),
    };
  }, [items]);

  const selectedPhotoItem = items.find((item) => item.id === photoItemId) ?? items[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <Wine size={14} />
            Unified bar and restaurant inventory
          </div>
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-white">
            Liquor & Bar Management
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track alcohol stock, wastage, restocks, and outlet sales in one admin workspace.
          </p>
        </div>
        <button
          onClick={() => loadItems(true)}
          disabled={loading || refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {loading || refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active SKUs" value={stats.active.toLocaleString()} />
        <Stat label="Low stock" value={stats.low.toLocaleString()} tone={stats.low > 0 ? "warning" : "neutral"} />
        <Stat label="Out of stock" value={stats.out.toLocaleString()} tone={stats.out > 0 ? "danger" : "neutral"} />
        <Stat label="Retail value" value={money(stats.retailValue)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Liquor earnings</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Today" value={money(summary?.todaySalesRevenue ?? 0)} />
            <MiniStat label="Units today" value={(summary?.todayUnitsSold ?? 0).toLocaleString()} />
            <MiniStat label="All-time sales" value={money(summary?.allTimeSalesRevenue ?? 0)} />
          </div>
          <div className="mt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Top movers this month
            </p>
            {summary?.topItems?.length ? (
              <div className="space-y-3">
                {summary.topItems.map((item) => (
                  <div key={item.liquorItemId} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-zinc-950 dark:text-white">{item.name}</p>
                      <p className="text-xs text-zinc-500">{item.sku} - {item.quantity} sold</p>
                    </div>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {money(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No liquor sales recorded this month yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Recent stock records</h2>
          <div className="mt-4 space-y-3">
            {summary?.recentTransactions?.length ? (
              summary.recentTransactions.slice(0, 8).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-950 dark:text-white">
                      {transaction.liquorItem?.name ?? "Liquor item"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {label(transaction.type)} - {transaction.quantity} at {label(transaction.outlet)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    {new Date(transaction.timestamp).toLocaleTimeString("en-KE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No stock movements recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <form
          onSubmit={submitStockTransaction}
          className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              Log stock movement
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Liquor item">
              <select
                value={stockForm.itemId}
                onChange={(event) => setStockForm({ ...stockForm, itemId: event.target.value })}
                className={inputClass}
                required
              >
                {items.length === 0 ? (
                  <option value="">Create an item first</option>
                ) : (
                  items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku})
                    </option>
                  ))
                )}
              </select>
            </Field>

            <Field label="Movement type">
              <select
                value={stockForm.type}
                onChange={(event) =>
                  setStockForm({ ...stockForm, type: event.target.value as LiquorTransactionType })
                }
                className={inputClass}
              >
                <option value="SALE">Sale</option>
                <option value="RESTOCK">Restock</option>
                <option value="WASTAGE">Wastage</option>
                <option value="AUDIT">Audit count</option>
              </select>
            </Field>

            <Field label="Outlet">
              <select
                value={stockForm.outlet}
                onChange={(event) =>
                  setStockForm({ ...stockForm, outlet: event.target.value as LiquorOutlet })
                }
                className={inputClass}
              >
                <option value="BAR">Bar</option>
                <option value="RESTAURANT">Restaurant</option>
              </select>
            </Field>

            <Field label={stockForm.type === "AUDIT" ? "Counted stock" : "Quantity"}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={stockForm.quantity}
                onChange={(event) => setStockForm({ ...stockForm, quantity: Number(event.target.value) })}
                className={inputClass}
                required
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Description">
                <input
                  value={stockForm.description}
                  onChange={(event) => setStockForm({ ...stockForm, description: event.target.value })}
                  className={inputClass}
                  placeholder="Invoice number, breakage note, audit batch..."
                />
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={adjusting || !stockForm.itemId}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            {adjusting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Save stock movement
          </button>
        </form>

        <form
          onSubmit={createItem}
          className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-4 flex items-center gap-2">
            <Plus size={18} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              Add liquor item
            </h2>
          </div>

          <div className="mb-4">
            <Field label="Drink photo">
              <ImageUpload
                folder="liquor"
                currentImageUrl={newItem.imageUrl || null}
                onUpload={(url) => setNewItem((current) => ({ ...current, imageUrl: url }))}
                onRemove={() => setNewItem((current) => ({ ...current, imageUrl: "" }))}
                disabled={creating}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SKU">
              <input
                value={newItem.sku}
                onChange={(event) => setNewItem({ ...newItem, sku: event.target.value })}
                className={inputClass}
                placeholder="BAR-BEER-001"
                required
              />
            </Field>
            <Field label="Name">
              <input
                value={newItem.name}
                onChange={(event) => setNewItem({ ...newItem, name: event.target.value })}
                className={inputClass}
                placeholder="Tusker Lager"
                required
              />
            </Field>
            <Field label="Category">
              <select
                value={newItem.category}
                onChange={(event) => setNewItem({ ...newItem, category: event.target.value as LiquorCategory })}
                className={inputClass}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {label(category)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bottle size (ml)">
              <input
                type="number"
                min="1"
                value={newItem.bottleSizeMl}
                onChange={(event) => setNewItem({ ...newItem, bottleSizeMl: Number(event.target.value) })}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Cost price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItem.costPrice}
                onChange={(event) => setNewItem({ ...newItem, costPrice: Number(event.target.value) })}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Retail price">
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItem.retailPrice}
                onChange={(event) => setNewItem({ ...newItem, retailPrice: Number(event.target.value) })}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Opening stock">
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItem.currentStock}
                onChange={(event) => setNewItem({ ...newItem, currentStock: Number(event.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Low threshold">
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItem.lowStockThreshold}
                onChange={(event) =>
                  setNewItem({ ...newItem, lowStockThreshold: Number(event.target.value) })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-950 bg-white text-sm font-medium text-zinc-950 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Wine size={16} />}
            Create SKU
          </button>
        </form>
      </div>

      {selectedPhotoItem && (
        <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Update existing drink photo</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Select a saved SKU and upload a clean bottle or serving photo for the public bar menu.
            </p>
            <div className="mt-4">
              <Field label="Liquor item">
                <select
                  value={selectedPhotoItem.id}
                  onChange={(event) => setPhotoItemId(event.target.value)}
                  className={inputClass}
                  disabled={savingPhoto}
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <ImageUpload
              folder="liquor"
              currentImageUrl={selectedPhotoItem.imageUrl}
              onUpload={(url) => updateItemPhoto(selectedPhotoItem.id, url)}
              onRemove={() => updateItemPhoto(selectedPhotoItem.id, null)}
              disabled={savingPhoto}
            />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Inventory</h2>
            <p className="mt-1 text-xs text-zinc-500">Stock status across restaurant and bar outlets.</p>
          </div>
          {stats.low + stats.out > 0 && (
            <div className="hidden items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 sm:flex dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle size={14} />
              {stats.low + stats.out} item{stats.low + stats.out === 1 ? "" : "s"} need attention
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center text-sm text-zinc-500">
            <Loader2 size={18} className="mr-2 animate-spin" />
            Loading liquor inventory
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center px-5 text-center">
            <Wine size={30} className="text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-950 dark:text-white">No liquor items yet</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">
              Create your first SKU, then use stock movements to restock, record sales, wastage, or audit counts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950/60">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Bottle</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Threshold</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Retail</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Latest movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((item) => {
                  const currentStatus = stockStatus(item);
                  const latest = item.transactions[0];
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "transition hover:bg-zinc-50 dark:hover:bg-zinc-950/60",
                        currentStatus === "Out of Stock" && "bg-red-50/40 dark:bg-red-500/5",
                        currentStatus === "Low Stock" && "bg-amber-50/40 dark:bg-amber-500/5"
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            ) : (
                              <Wine size={18} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-950 dark:text-white">{item.name}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">{label(item.status)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{label(item.category)}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{item.bottleSizeMl}ml</td>
                      <td className="px-4 py-3 font-semibold text-zinc-950 dark:text-white">
                        {item.currentStock}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                        {item.lowStockThreshold}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{money(item.costPrice)}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{money(item.retailPrice)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusClass(currentStatus))}>
                          {currentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {latest ? (
                          <>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {label(latest.type)}
                            </span>{" "}
                            {latest.quantity} at {label(latest.outlet)}
                          </>
                        ) : (
                          "No movement yet"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 dark:bg-zinc-900",
        tone === "warning" ? "border-amber-200 dark:border-amber-500/30" : "",
        tone === "danger" ? "border-red-200 dark:border-red-500/30" : "",
        tone === "neutral" ? "border-zinc-200 dark:border-zinc-800" : ""
      )}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}
