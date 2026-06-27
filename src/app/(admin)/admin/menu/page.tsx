"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, RefreshCcw, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { MenuItemModal } from "@/components/admin/MenuItemModal";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { formatKES } from "@/lib/utils";
import { labelFromEnum } from "@/lib/visuals";
import type { ApiResponse, MenuItem } from "@/types";

const categories = ["ALL", "GRILL", "DRINKS", "SPECIALS", "SEAFOOD", "STARTERS", "DESSERTS"] as const;
const ADMIN_MENU_QUERY_KEY = ["admin-menu"] as const;

type CategoryFilter = (typeof categories)[number];
type MenuDeleteResponse = ApiResponse<MenuItem> & { softDeleted?: boolean };

async function readJson<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, error: "The server returned an invalid response." };
  }
}

async function fetchMenuItems() {
  const res = await fetch("/api/menu?available=false", { credentials: "include" });
  const data = await readJson<MenuItem[]>(res);
  if (!res.ok || !data.success || !data.data) {
    throw new Error(data.error ?? "Could not load menu items.");
  }
  return data.data;
}

export default function AdminMenuPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const menuQuery = useQuery({
    queryKey: ADMIN_MENU_QUERY_KEY,
    queryFn: fetchMenuItems,
  });
  useRealtimeTable("menu_items", ADMIN_MENU_QUERY_KEY);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpenCreate = params.get("new") === "menu" || params.get("new") === "1";

    if (!shouldOpenCreate) return;

    setEditingItem(null);
    setModalOpen(true);
    params.delete("new");

    const nextSearch = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
  }, []);

  const filteredItems = useMemo(() => {
    const items = menuQuery.data ?? [];
    return category === "ALL" ? items : items.filter((item) => item.category === category);
  }, [category, menuQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<MenuItem> }) => {
      const res = await fetch(`/api/menu/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJson<MenuItem>(res);
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error ?? "Could not update menu item.");
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_MENU_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update menu item.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/menu/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await readJson<MenuItem>(res)) as MenuDeleteResponse;
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not delete menu item.");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.softDeleted ? "Item has orders, so it was hidden from the public menu." : "Menu item deleted.");
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ADMIN_MENU_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete menu item.");
    },
  });

  function openCreate() {
    setEditingItem(null);
    setModalOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function refreshMenu() {
    queryClient.invalidateQueries({ queryKey: ADMIN_MENU_QUERY_KEY });
  }

  return (
    <div>
      <AdminSectionHeader
        title="Menu"
        description="Manage dishes, drinks, pricing, images, and customer-facing availability."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshMenu}
              disabled={menuQuery.isFetching}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <RefreshCcw size={16} className={menuQuery.isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-500"
            >
              <Plus size={16} />
              Add item
            </button>
          </div>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${
              category === item
                ? "bg-zinc-950 text-white dark:bg-amber-600"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800"
            }`}
          >
            {item === "ALL" ? "All" : labelFromEnum(item)}
          </button>
        ))}
      </div>

      {menuQuery.isLoading && <MenuSkeleton />}

      {menuQuery.isError && (
        <ErrorState
          message={menuQuery.error instanceof Error ? menuQuery.error.message : "Could not load menu items."}
          onRetry={() => menuQuery.refetch()}
        />
      )}

      {!menuQuery.isLoading && !menuQuery.isError && filteredItems.length === 0 && (
        <EmptyState title="No menu items found" detail="Add your first item or switch filters to view hidden categories." />
      )}

      {!menuQuery.isLoading && !menuQuery.isError && filteredItems.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="hidden grid-cols-[minmax(260px,1.6fr)_140px_120px_130px_150px] border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-500 md:grid dark:border-zinc-800 dark:bg-zinc-950">
            <span>Item</span>
            <span>Category</span>
            <span>Price</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredItems.map((item) => {
              const isWorking = updateMutation.isPending || deleteMutation.isPending;
              return (
                <article key={item.id} className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(260px,1.6fr)_140px_120px_130px_150px] md:items-center">
                  <div className="flex min-w-0 gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-500">
                          {labelFromEnum(item.category).slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">{item.name}</h2>
                        {item.isFeatured && <Star size={14} className="shrink-0 fill-amber-500 text-amber-500" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500">{item.description}</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-300">{labelFromEnum(item.category)}</div>
                  <div className="text-sm font-semibold text-zinc-950 dark:text-white">{formatKES(item.price)}</div>
                  <button
                    onClick={() =>
                      updateMutation.mutate(
                        { id: item.id, payload: { isAvailable: !item.isAvailable } },
                        {
                          onSuccess: () => toast.success(item.isAvailable ? "Item hidden from public menu." : "Item is visible on public menu."),
                        }
                      )
                    }
                    disabled={isWorking}
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
                      item.isAvailable
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {item.isAvailable ? "Available" : "Hidden"}
                  </button>
                  <div className="flex items-center justify-start gap-2 md:justify-end">
                    {confirmDeleteId === item.id ? (
                      <>
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => openEdit(item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <MenuItemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialData={editingItem}
        onSuccess={refreshMenu}
      />
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex gap-3 border-b border-zinc-100 p-4 last:border-0 dark:border-zinc-800">
          <div className="h-16 w-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-44 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <p className="font-medium">{message}</p>
      <button onClick={onRetry} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-xs font-medium text-white">
        <Loader2 size={14} />
        Retry
      </button>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}
