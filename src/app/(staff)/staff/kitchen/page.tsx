"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ordersApi } from "@/lib/api";
import { formatKES, orderStatusColor, capitalize, timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  tableNumber?: string;
  createdAt: string;
  user: { name: string; phone?: string };
  orderItems: Array<{
    quantity: number;
    notes?: string;
    menuItem: { name: string; emoji: string };
  }>;
}

const TRACK_STEPS = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];

export default function KitchenPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !["KITCHEN", "ADMIN"].includes(user?.role ?? "")) {
      router.replace("/");
      return;
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  async function fetchOrders() {
    try {
      const res = await ordersApi.getAll({ status: "PENDING,CONFIRMED,PREPARING,READY" });
      setOrders(res.data.data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdating(orderId);
    try {
      await ordersApi.updateStatus(orderId, status);
      await fetchOrders();
      toast.success(`Order → ${capitalize(status)}`);
    } catch {
      toast.error("Update failed");
    } finally {
      setUpdating(null);
    }
  }

  const pending = orders.filter((o) => o.status === "PENDING");
  const active = orders.filter((o) => ["CONFIRMED", "PREPARING"].includes(o.status));
  const ready = orders.filter((o) => o.status === "READY");

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-amber-500 font-semibold">Kitchen Panel</h1>
          <p className="text-zinc-600 text-xs">{user?.name} · Kitchen Staff</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Summary pills */}
        <div className="flex gap-3">
          {[
            { label: "New", count: pending.length, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
            { label: "Cooking", count: active.length, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
            { label: "Ready", count: ready.length, color: "bg-green-500/20 text-green-400 border-green-500/30" },
          ].map((s) => (
            <div key={s.label} className={`flex-1 text-center px-3 py-2 rounded-xl border ${s.color}`}>
              <div className="text-xl font-semibold">{s.count}</div>
              <div className="text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Order cards */}
        {loading ? (
          <div className="text-center py-10 text-zinc-600 text-sm">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            <CheckCircle size={32} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-sm">All caught up — no pending orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`bg-zinc-900 border rounded-2xl p-4 ${
                  order.status === "PENDING"
                    ? "border-yellow-500/40"
                    : order.status === "READY"
                    ? "border-green-500/40"
                    : "border-zinc-800"
                }`}
              >
                {/* Order header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">{order.orderNumber}</span>
                    {order.tableNumber && (
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                        Table {order.tableNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${orderStatusColor(order.status)}`}>
                      {capitalize(order.status)}
                    </span>
                    <span className="text-zinc-600 text-xs flex items-center gap-1">
                      <Clock size={10} /> {timeAgo(order.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5 mb-4">
                  {order.orderItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-lg">{item.menuItem.emoji}</span>
                      <div>
                        <span className="text-sm text-zinc-200">
                          ×{item.quantity} {item.menuItem.name}
                        </span>
                        {item.notes && (
                          <p className="text-xs text-amber-400 mt-0.5">Note: {item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tracking bar */}
                <div className="flex gap-1 mb-4">
                  {TRACK_STEPS.slice(0, 4).map((step, i) => {
                    const stepIndex = TRACK_STEPS.indexOf(order.status);
                    const done = i <= stepIndex;
                    return (
                      <div
                        key={step}
                        className={`flex-1 h-1 rounded-full transition-colors ${
                          done ? "bg-amber-500" : "bg-zinc-800"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {order.status === "PENDING" && (
                    <button
                      onClick={() => updateStatus(order.id, "CONFIRMED")}
                      disabled={updating === order.id}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl disabled:opacity-50"
                    >
                      Accept order
                    </button>
                  )}
                  {order.status === "CONFIRMED" && (
                    <button
                      onClick={() => updateStatus(order.id, "PREPARING")}
                      disabled={updating === order.id}
                      className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Flame size={13} /> Start cooking
                    </button>
                  )}
                  {order.status === "PREPARING" && (
                    <button
                      onClick={() => updateStatus(order.id, "READY")}
                      disabled={updating === order.id}
                      className="flex-1 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle size={13} /> Mark ready
                    </button>
                  )}
                  {order.status === "READY" && (
                    <button
                      onClick={() => updateStatus(order.id, "DELIVERED")}
                      disabled={updating === order.id}
                      className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded-xl disabled:opacity-50"
                    >
                      Mark delivered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
