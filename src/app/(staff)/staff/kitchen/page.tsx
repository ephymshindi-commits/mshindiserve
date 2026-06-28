"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Flame, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { authApi, ordersApi } from "@/lib/api";
import { capitalize, orderStatusColor, timeAgo } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  tableNumber?: string | null;
  createdAt: string;
  user: { name: string; phone?: string | null };
  orderItems: Array<{
    quantity: number;
    notes?: string | null;
    menuItem: { name: string };
  }>;
}

const TRACK_STEPS = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];
const KITCHEN_ORDERS_QUERY_KEY = ["kitchen-orders"] as const;

async function fetchKitchenOrders() {
  const res = await ordersApi.getAll({ status: "PENDING,CONFIRMED,PREPARING,READY" });
  return (res.data.data ?? []) as Order[];
}

function playNewOrderBeep() {
  try {
    const AudioContextCtor =
      window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);

    window.setTimeout(() => {
      void audioContext.close();
    }, 400);
  } catch {
    // Browsers may block audio until the page has user interaction.
  }
}

export default function KitchenPage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const previousPendingRef = useRef(0);
  const firstOrdersLoadedRef = useRef(false);

  const ordersQuery = useQuery({
    queryKey: KITCHEN_ORDERS_QUERY_KEY,
    queryFn: fetchKitchenOrders,
    enabled: !checking,
    refetchInterval: 15000,
  });
  useRealtimeTable("orders", KITCHEN_ORDERS_QUERY_KEY, !checking);

  useEffect(() => {
    let cancelled = false;

    async function verifyStaff() {
      try {
        const res = await authApi.me();
        const sessionUser = res.data.data.user;
        if (cancelled) return;
        setUser(sessionUser);

        if (!["KITCHEN", "ADMIN"].includes(sessionUser.role ?? "")) {
          router.replace("/");
          return;
        }

        setChecking(false);
      } catch {
        if (!cancelled) router.replace("/login?next=/staff/kitchen");
      }
    }

    verifyStaff();

    return () => {
      cancelled = true;
    };
  }, [router, setUser]);

  async function updateStatus(orderId: string, status: string) {
    setUpdating(orderId);
    try {
      await ordersApi.updateStatus(orderId, status);
      await queryClient.invalidateQueries({ queryKey: KITCHEN_ORDERS_QUERY_KEY });
      toast.success(`Order moved to ${capitalize(status)}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  const orders = ordersQuery.data ?? [];
  const pending = orders.filter((order) => order.status === "PENDING");
  const active = orders.filter((order) => ["CONFIRMED", "PREPARING"].includes(order.status));
  const ready = orders.filter((order) => order.status === "READY");

  useEffect(() => {
    if (checking || ordersQuery.isLoading) return;

    if (!firstOrdersLoadedRef.current) {
      firstOrdersLoadedRef.current = true;
      previousPendingRef.current = pending.length;
      return;
    }

    if (pending.length > previousPendingRef.current) {
      playNewOrderBeep();
    }
    previousPendingRef.current = pending.length;
  }, [checking, ordersQuery.isLoading, pending.length]);

  useEffect(() => {
    if (checking) return;

    document.title =
      pending.length > 0
        ? `(${pending.length}) Kitchen | MshindiServe`
        : "Kitchen | MshindiServe";

    return () => {
      document.title = "MshindiServe";
    };
  }, [checking, pending.length]);

  useEffect(() => {
    if (ordersQuery.isError) {
      toast.error("Failed to load orders");
    }
  }, [ordersQuery.isError]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-900 px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            <h1 className="font-semibold text-amber-400">Kitchen Panel</h1>
            <p className="mt-1 text-xs text-zinc-500">{user?.name ?? "Kitchen staff"}</p>
          </div>
          <button
            onClick={() => ordersQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
          >
            <RefreshCw size={14} className={ordersQuery.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "New", count: pending.length, color: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300" },
            { label: "Cooking", count: active.length, color: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
            { label: "Ready", count: ready.length, color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
          ].map((item) => (
            <div key={item.label} className={`rounded-lg border p-3 text-center ${item.color}`}>
              <p className="text-2xl font-semibold">{item.count}</p>
              <p className="mt-1 text-xs">{item.label}</p>
            </div>
          ))}
        </div>

        {ordersQuery.isLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 p-10">
            <Loader2 size={22} className="animate-spin text-amber-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
            <CheckCircle size={32} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-sm">All caught up. No active orders right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <article
                key={order.id}
                className={`rounded-lg border bg-zinc-900 p-4 ${
                  order.status === "PENDING"
                    ? "border-yellow-500/40"
                    : order.status === "READY"
                    ? "border-emerald-500/40"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
                      {order.tableNumber && (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          Table {order.tableNumber}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{order.user.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${orderStatusColor(order.status)}`}>
                      {capitalize(order.status)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <Clock size={12} /> {timeAgo(order.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {order.orderItems.map((item, index) => (
                    <div key={`${order.id}-${index}`} className="rounded-lg bg-zinc-950 p-3">
                      <p className="text-sm text-zinc-100">
                        {item.quantity} x {item.menuItem.name}
                      </p>
                      {item.notes && <p className="mt-1 text-xs text-amber-300">Note: {item.notes}</p>}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-1">
                  {TRACK_STEPS.slice(0, 4).map((step, index) => {
                    const currentIndex = TRACK_STEPS.indexOf(order.status);
                    return (
                      <div
                        key={step}
                        className={`h-1 flex-1 rounded-full ${index <= currentIndex ? "bg-amber-500" : "bg-zinc-800"}`}
                      />
                    );
                  })}
                </div>

                <div className="mt-4">
                  {order.status === "PENDING" && (
                    <ActionButton onClick={() => updateStatus(order.id, "CONFIRMED")} busy={updating === order.id}>
                      Accept order
                    </ActionButton>
                  )}
                  {order.status === "CONFIRMED" && (
                    <ActionButton onClick={() => updateStatus(order.id, "PREPARING")} busy={updating === order.id}>
                      <Flame size={14} /> Start cooking
                    </ActionButton>
                  )}
                  {order.status === "PREPARING" && (
                    <ActionButton onClick={() => updateStatus(order.id, "READY")} busy={updating === order.id}>
                      <CheckCircle size={14} /> Mark ready
                    </ActionButton>
                  )}
                  {order.status === "READY" && (
                    <ActionButton onClick={() => updateStatus(order.id, "DELIVERED")} busy={updating === order.id}>
                      Mark delivered
                    </ActionButton>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : children}
    </button>
  );
}
