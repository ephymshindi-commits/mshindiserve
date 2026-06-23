"use client";

import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatKES } from "@/lib/utils";

export function CartFab() {
  const { totalItems, totalAmount, openCart, isOpen } = useCartStore();
  const count = totalItems();

  if (count === 0 || isOpen) return null;

  return (
    <button
      onClick={openCart}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl shadow-lg shadow-amber-900/30 transition-all hover:scale-105 active:scale-95"
    >
      <ShoppingBag size={18} />
      <span className="text-sm font-medium">{formatKES(totalAmount())}</span>
      <span className="bg-white text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
        {count}
      </span>
    </button>
  );
}
