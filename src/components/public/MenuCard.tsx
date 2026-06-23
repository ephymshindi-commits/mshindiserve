"use client";

import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { formatKES } from "@/lib/utils";
import type { MenuItem } from "@/types";

interface MenuCardProps {
  item: MenuItem;
}

export function MenuCard({ item }: MenuCardProps) {
  const { addItem, openCart } = useCartStore();

  function handleAdd() {
    addItem(item);
    toast.success(`${item.emoji} ${item.name} added!`, { duration: 1500 });
  }

  return (
    <div className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-200 dark:hover:border-amber-900 transition-colors">
      {/* Image / emoji placeholder */}
      <div className="h-28 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-4xl">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            width={200}
            height={112}
            className="w-full h-full object-cover"
          />
        ) : (
          item.emoji
        )}
      </div>

      <div className="p-3">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-white leading-tight mb-0.5">
          {item.name}
        </h3>
        <p className="text-xs text-zinc-500 leading-relaxed mb-3 line-clamp-2">
          {item.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-amber-600">
            {formatKES(item.price)}
          </span>
          <button
            onClick={handleAdd}
            disabled={!item.isAvailable}
            className="w-7 h-7 rounded-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
            aria-label={`Add ${item.name} to cart`}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
