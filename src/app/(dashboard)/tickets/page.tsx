"use client";

import { Loader2, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/shared/AuthModal";
import { ticketsApi } from "@/lib/api";
import { capitalize, formatDate, formatKES, paymentStatusColor } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface TicketRecord {
  id: string;
  ticketCode: string;
  quantity: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  event: { title: string; date: string; venue: string };
}

export default function TicketsPage() {
  const { isAuthenticated } = useAuthStore();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    ticketsApi
      .getAll()
      .then((res) => setTickets(res.data.data ?? []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <AccountPage
      title="My tickets"
      description="View event tickets reserved through MshindiServe."
      icon={<Ticket size={22} />}
      isAuthenticated={isAuthenticated}
      loading={loading}
      onSignIn={() => setAuthOpen(true)}
    >
      {tickets.length === 0 ? (
        <EmptyState title="No tickets yet" text="Buy an event ticket and your code will appear here." />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {ticket.ticketCode}
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-950 dark:text-white">
                    {ticket.event.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDate(ticket.event.date)} - {ticket.event.venue}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatusColor(ticket.paymentStatus)}`}>
                    {capitalize(ticket.paymentStatus)}
                  </span>
                  <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                    {formatKES(ticket.totalAmount)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-500">
                {ticket.quantity} ticket{ticket.quantity === 1 ? "" : "s"} reserved - {capitalize(ticket.status)}
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
