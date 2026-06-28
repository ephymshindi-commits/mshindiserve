"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useState } from "react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { ordersApi } from "@/lib/api";
import { capitalize, formatKES, orderStatusColor, paymentStatusColor } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  tableNumber?: string | null;
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

const ADMIN_ORDERS_QUERY_KEY = ["admin-orders"] as const;

function paymentLabel(status: string) {
  return status === "COMPLETED" ? "Paid" : capitalize(status);
}

async function fetchAdminOrders() {
  const res = await fetch("/api/orders?limit=50", {
    credentials: "include",
    cache: "no-store",
  });

  let payload: { success?: boolean; data?: Order[]; error?: string };
  try {
    payload = (await res.json()) as { success?: boolean; data?: Order[]; error?: string };
  } catch {
    throw new Error("The server returned an invalid orders response.");
  }

  if (!res.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to load orders.");
  }

  return payload.data ?? [];
}

export function AdminOrdersTable({ orders: initial, compact = false }: Props) {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);
  const ordersQuery = useQuery({
    queryKey: ADMIN_ORDERS_QUERY_KEY,
    queryFn: fetchAdminOrders,
    initialData: initial,
  });
  useRealtimeTable("orders", ADMIN_ORDERS_QUERY_KEY);

  const orders = ordersQuery.data ?? [];

  async function advance(orderId: string, currentStatus: string) {
    const next = STATUS_FLOW[currentStatus];
    if (!next) return;

    setUpdating(orderId);
    try {
      await ordersApi.updateStatus(orderId, next);
      await queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_QUERY_KEY });
      toast.success(`Order moved to ${capitalize(next)}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? "Failed to update order");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      {ordersQuery.isError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {ordersQuery.error instanceof Error ? ordersQuery.error.message : "Failed to load orders."}
        </div>
      )}
      {ordersQuery.isFetching && (
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          Refreshing orders...
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-950">
            <th className="px-4 py-3 text-xs font-medium text-zinc-500">Order</th>
            <th className="px-4 py-3 text-xs font-medium text-zinc-500">Customer</th>
            <th className="px-4 py-3 text-xs font-medium text-zinc-500">Table</th>
            {!compact && <th className="px-4 py-3 text-xs font-medium text-zinc-500">Items</th>}
            <th className="px-4 py-3 text-xs font-medium text-zinc-500">Total</th>
            <th className="px-4 py-3 text-xs font-medium text-zinc-500">Payment</th>
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
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {order.tableNumber ? `Table ${order.tableNumber}` : "Takeaway"}
                </td>
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
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatusColor(order.paymentStatus)}`}>
                    {paymentLabel(order.paymentStatus)}
                  </span>
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
