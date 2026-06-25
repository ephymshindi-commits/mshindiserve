"use client";

import { BedDouble, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/shared/AuthModal";
import { bookingsApi } from "@/lib/api";
import { bookingStatusColor, capitalize, formatDate, formatKES } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface BookingRecord {
  id: string;
  bookingNumber: string;
  status: string;
  totalAmount: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  room: { name: string };
}

export default function BookingsPage() {
  const { isAuthenticated } = useAuthStore();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    bookingsApi
      .getAll()
      .then((res) => setBookings(res.data.data ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <AccountPage
      title="My bookings"
      description="Review room reservations and stay details."
      icon={<BedDouble size={22} />}
      isAuthenticated={isAuthenticated}
      loading={loading}
      onSignIn={() => setAuthOpen(true)}
    >
      {bookings.length === 0 ? (
        <EmptyState title="No bookings yet" text="Reserve a room and your booking will appear here." />
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-zinc-950 dark:text-white">
                    {booking.bookingNumber}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{booking.room.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${bookingStatusColor(booking.status)}`}>
                    {capitalize(booking.status)}
                  </span>
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {formatKES(booking.totalAmount)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-500">
                {formatDate(booking.checkIn)} to {formatDate(booking.checkOut)} - {booking.guests} guest
                {booking.guests === 1 ? "" : "s"}
              </p>
            </article>
          ))}
        </div>
      )}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </AccountPage>
  );
}

function AccountPage({
  title,
  description,
  icon,
  isAuthenticated,
  loading,
  onSignIn,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  isAuthenticated: boolean;
  loading: boolean;
  onSignIn: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50 pb-16 dark:bg-zinc-950">
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">{title}</h1>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900">
            <Loader2 size={20} className="animate-spin text-amber-600" />
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-950 dark:text-white">Sign in required</p>
            <p className="mt-1 text-sm text-zinc-500">Use your guest account to view this history.</p>
            <button
              onClick={onSignIn}
              className="mt-5 h-10 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Sign in
            </button>
          </div>
        ) : (
          children
        )}
      </section>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-950 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{text}</p>
    </div>
  );
}
