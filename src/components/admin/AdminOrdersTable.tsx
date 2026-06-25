"use client";

import { format } from "date-fns";
import toast from "react-hot-toast";
import { useState } from "react";
import { ordersApi } from "@/lib/api";
import { capitalize, formatKES, orderStatusColor } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string | Date;
  user: { name: string };
  orderItems: Array<{ quantity?: number; menuItem: { name: string } }>;
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
        prev.map((order) => (order.id === orderId ? { ...order, status: res.data.data.status } : order))
      );
      toast.success(`Order moved to ${capitalize(next)}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? "Failed to update order");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-950">
            <th className="px-4 py-3 text-xs font-medium text-zinc-500">Order</th>
            <th className="px-4 py-3 text-xs font-medium text-zinc-500">Customer</th>
            {!compact && <th className="px-4 py-3 text-xs font-medium text-zinc-500">Items</th>}
            <th className="px-4 py-3 text-xs font-medium text-zinc-500">Total</th>
            <th className="px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
            <th className="px-4 py-3 text-xs font-medium text-zinc-500">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const next = STATUS_FLOW[order.status];
            return (
              <tr
                key={order.id}
                className="border-b border-zinc-100 transition hover:bg-zinc-50 dark:border-zinc-800/70 dark:hover:bg-zinc-800/40"
              >
                <td className="px-4 py-3 font-medium text-zinc-950 dark:text-white">
                  {order.orderNumber}
                  {!compact && (
                    <div className="mt-0.5 text-xs font-normal text-zinc-400">
                      {format(new Date(order.createdAt), "HH:mm")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{order.user.name}</td>
                {!compact && (
                  <td className="max-w-xs px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {order.orderItems
                      .slice(0, 3)
                      .map((item) => `${item.quantity ?? 1} x ${item.menuItem.name}`)
                      .join(", ")}
                    {order.orderItems.length > 3 && ` +${order.orderItems.length - 3}`}
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-amber-700 dark:text-amber-400">
                  {formatKES(order.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${orderStatusColor(order.status)}`}>
                    {capitalize(order.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {next ? (
                    <button
                      onClick={() => advance(order.id, order.status)}
                      disabled={updating === order.id}
                      className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-amber-100 hover:text-amber-800 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                    >
                      {updating === order.id ? "Updating" : `Mark ${capitalize(next)}`}
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-400">Complete</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders.length === 0 && (
        <div className="py-10 text-center text-sm text-zinc-400">No orders found</div>
      )}
    </div>
  );
}
