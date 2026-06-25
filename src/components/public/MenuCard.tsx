"use client";

import Image from "next/image";
import { Plus, UtensilsCrossed } from "lucide-react";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";
import { formatKES } from "@/lib/utils";
import { labelFromEnum, menuImage } from "@/lib/visuals";
import type { MenuItem } from "@/types";

interface MenuCardProps {
  item: MenuItem;
}

export function MenuCard({ item }: MenuCardProps) {
  const { addItem } = useCartStore();

  function handleAdd() {
    addItem(item);
    toast.success(`${item.name} added to cart`, { duration: 1500 });
  }

  return (
    <article className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative h-40 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={menuImage(item)}
          alt={item.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-zinc-700 shadow-sm backdrop-blur dark:bg-zinc-950/80 dark:text-zinc-200">
          {labelFromEnum(item.category)}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold text-zinc-950 dark:text-white">
            {item.name}
          </h3>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            {formatKES(item.price)}
          </span>
          <button
            onClick={handleAdd}
            disabled={!item.isAvailable}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-950 px-3 text-xs font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
            aria-label={`Add ${item.name} to cart`}
          >
            {item.isAvailable ? <Plus size={14} /> : <UtensilsCrossed size={14} />}
            {item.isAvailable ? "Add" : "Out"}
          </button>
        </div>
      </div>
    </article>
  );
}
