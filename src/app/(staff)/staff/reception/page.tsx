"use client";

import { BedDouble, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authApi, bookingsApi } from "@/lib/api";
import { bookingStatusColor, capitalize, formatDate, formatKES } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  specialReqs?: string | null;
  user: { name: string; email: string; phone?: string | null };
  room: { name: string };
}

const NEXT_STATUS: Record<string, string | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "CHECKED_IN",
  CHECKED_IN: "CHECKED_OUT",
  CHECKED_OUT: null,
  CANCELLED: null,
};

export default function ReceptionPage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyStaff() {
      try {
        const res = await authApi.me();
        const sessionUser = res.data.data.user;
        if (cancelled) return;
        setUser(sessionUser);

        if (!["RECEPTION", "ADMIN"].includes(sessionUser.role ?? "")) {
          router.replace("/");
          return;
        }

        setChecking(false);
        await fetchBookings();
      } catch {
        if (!cancelled) router.replace("/login?next=/staff/reception");
      }
    }

    verifyStaff();

    return () => {
      cancelled = true;
    };
  }, [router, setUser]);

  async function fetchBookings() {
    try {
      const res = await bookingsApi.getAll();
      setBookings(res.data.data ?? []);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  async function advance(booking: Booking) {
    const next = NEXT_STATUS[booking.status];
    if (!next) return;

    setUpdating(booking.id);
    try {
      await bookingsApi.update(booking.id, { status: next });
      await fetchBookings();
      toast.success(`Booking moved to ${capitalize(next)}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  const active = bookings.filter((booking) => !["CHECKED_OUT", "CANCELLED"].includes(booking.status));

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <h1 className="font-semibold text-zinc-950 dark:text-white">Reception Panel</h1>
            <p className="mt-1 text-xs text-zinc-500">{user?.name ?? "Reception staff"}</p>
          </div>
          <button
            onClick={fetchBookings}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Active", active.length],
            ["Arrivals", bookings.filter((booking) => booking.status === "CONFIRMED").length],
            ["In house", bookings.filter((booking) => booking.status === "CHECKED_IN").length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-2xl font-semibold text-zinc-950 dark:text-white">{value}</p>
              <p className="mt-1 text-xs text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900">
            <Loader2 size={22} className="animate-spin text-amber-600" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <BedDouble size={32} className="mx-auto mb-3 text-zinc-400" />
            <p className="text-sm text-zinc-500">No bookings found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const next = NEXT_STATUS[booking.status];
              return (
                <article key={booking.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold text-amber-700 dark:text-amber-400">
                        {booking.bookingNumber}
                      </p>
                      <h2 className="mt-1 font-semibold text-zinc-950 dark:text-white">{booking.room.name}</h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        {formatDate(booking.checkIn)} to {formatDate(booking.checkOut)} - {booking.guests} guest
                        {booking.guests === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${bookingStatusColor(booking.status)}`}>
                        {capitalize(booking.status)}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {capitalize(booking.paymentStatus)}
                      </span>
                      <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                        {formatKES(booking.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
                      <p className="font-medium text-zinc-950 dark:text-white">{booking.user.name}</p>
                      <p className="mt-1">{booking.user.email}</p>
                      {booking.user.phone && <p>{booking.user.phone}</p>}
                      {booking.specialReqs && <p className="mt-2 text-amber-700 dark:text-amber-300">Request: {booking.specialReqs}</p>}
                    </div>

                    {next ? (
                      <button
                        onClick={() => advance(booking)}
                        disabled={updating === booking.id}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                      >
                        {updating === booking.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        Mark {capitalize(next)}
                      </button>
                    ) : (
                      <span className="text-sm text-zinc-400">No action needed</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
