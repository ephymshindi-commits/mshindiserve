"use client";

import { useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { ordersApi } from "@/lib/api";
import { formatKES, orderStatusColor, capitalize } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  user: { name: string };
  orderItems: Array<{ menuItem: { name: string; emoji: string } }>;
}

interface Props {
  orders: Order[];
  compact?: boolean;
}

const STATUS_FLOW: Record<string, string | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

export function AdminOrdersTable({ orders: initial, compact = false }: Props) {
  const [orders, setOrders] = useState(initial);
  const [updating, setUpdating] = useState<string | null>(null);

  async function advance(orderId: string, currentStatus: string) {
    const next = STATUS_FLOW[currentStatus];
    if (!next) return;

    setUpdating(orderId);
    try {
      const res = await ordersApi.updateStatus(orderId, next);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: res.data.data.status } : o))
      );
      toast.success(`Order updated to ${capitalize(next)}`);
    } catch {
      toast.error("Failed to update order");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <th className="px-4 py-3 text-left font-medium text-zinc-500">Order</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-500">Customer</th>
            {!compact && <th className="px-4 py-3 text-left font-medium text-zinc-500">Items</th>}
            <th className="px-4 py-3 text-left font-medium text-zinc-500">Total</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-500">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const next = STATUS_FLOW[order.status];
            return (
              <tr
                key={order.id}
                className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                  {order.orderNumber}
                  {!compact && (
                    <div className="text-zinc-400 font-normal mt-0.5">
                      {format(new Date(order.createdAt), "HH:mm")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{order.user.name}</td>
                {!compact && (
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {order.orderItems
                      .slice(0, 2)
                      .map((i) => `${i.menuItem.emoji} ${i.menuItem.name}`)
                      .join(", ")}
                    {order.orderItems.length > 2 && ` +${order.orderItems.length - 2}`}
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-amber-600">
                  {formatKES(order.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-medium ${orderStatusColor(order.status)}`}
                  >
                    {capitalize(order.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {next ? (
                    <button
                      onClick={() => advance(order.id, order.status)}
                      disabled={updating === order.id}
                      className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-900/20 text-zinc-700 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-amber-400 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {updating === order.id ? "…" : `→ ${capitalize(next)}`}
                    </button>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders.length === 0 && (
        <div className="text-center py-10 text-sm text-zinc-400">No orders found</div>
      )}
    </div>
  );
}
