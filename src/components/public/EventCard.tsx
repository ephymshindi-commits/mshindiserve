"use client";

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Loader2, MapPin, Ticket, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AuthModal } from "@/components/shared/AuthModal";
import { ticketsApi, paymentsApi } from "@/lib/api";
import { formatKES } from "@/lib/utils";
import { eventImage } from "@/lib/visuals";
import { useAuthStore } from "@/store/authStore";
import type { Event } from "@/types";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const { isAuthenticated } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [qty, setQty] = useState(1);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);

  const eventDate = new Date(event.date);
  const remaining = Math.max(0, event.totalSeats - event.soldSeats);
  const maxQty = Math.max(1, Math.min(5, remaining));
  const isSoldOut = remaining === 0;

  const ticketOptions = useMemo(
    () => Array.from({ length: maxQty }, (_, index) => index + 1),
    [maxQty]
  );

  useEffect(() => {
    if (qty > maxQty) setQty(maxQty);
  }, [maxQty, qty]);

  function handleBuyClick() {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    setShowTicketModal(true);
  }

  async function confirmPurchase() {
    const normalizedPhone = phone.replace(/\s/g, "");
    if (!/^(\+254|0)[17]\d{8}$/.test(normalizedPhone)) {
      toast.error("Enter a valid Safaricom number");
      return;
    }

    setLoading(true);
    try {
      const ticketRes = await ticketsApi.buy(event.id, qty);
      const ticket = ticketRes.data.data;

      await paymentsApi.stkPush({ phoneNumber: normalizedPhone, ticketId: ticket.id });

      setTicketCode(ticket.ticketCode);
      toast.success("Ticket reserved. Check your phone to complete payment.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Ticket purchase failed");
    } finally {
      setLoading(false);
    }
  }

  function closeTicketModal() {
    setShowTicketModal(false);
    setTicketCode(null);
    setPhone("");
    setQty(1);
  }

  return (
    <>
      <article className="grid overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm md:grid-cols-[220px_1fr] dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative h-48 md:h-full">
          <Image
            src={eventImage(event)}
            alt={event.title}
            fill
            sizes="(min-width: 768px) 220px, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CalendarDays size={12} />
                {format(eventDate, "EEE, d MMM - h:mm a")}
              </div>
              <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                {event.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {event.description}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {formatKES(event.ticketPrice)}
              </p>
              <p className="text-xs text-zinc-500">per person</p>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} />
                {event.venue}
              </span>
              <span>{isSoldOut ? "Sold out" : `${remaining} seats remaining`}</span>
            </div>

            <button
              onClick={handleBuyClick}
              disabled={isSoldOut}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              <Ticket size={15} />
              Buy ticket
            </button>
          </div>
        </div>
      </article>

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          setShowTicketModal(true);
        }}
      />

      <Dialog.Root open={showTicketModal} onOpenChange={(open) => !open && closeTicketModal()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-5 shadow-2xl dark:bg-zinc-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-base font-semibold text-zinc-950 dark:text-white">
                  {ticketCode ? "Ticket reserved" : event.title}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-zinc-500">
                  {ticketCode
                    ? "Complete payment from your phone to confirm attendance."
                    : `${format(eventDate, "EEEE, d MMMM yyyy")} at ${event.venue}`}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            {ticketCode ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle2 size={26} />
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-xs text-zinc-500">Ticket code</p>
                  <p className="mt-1 font-mono text-lg font-bold tracking-widest text-amber-700 dark:text-amber-400">
                    {ticketCode}
                  </p>
                </div>
                <button
                  onClick={closeTicketModal}
                  className="h-11 w-full rounded-lg bg-zinc-950 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-zinc-500">Number of tickets</span>
                  <select
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    {ticketOptions.map((option) => (
                      <option key={option} value={option}>
                        {option} ticket{option > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-zinc-500">M-Pesa phone number</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 712 345 678"
                    className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </label>

                <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
                  <span className="text-zinc-500">Total</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {formatKES(event.ticketPrice * qty)}
                  </span>
                </div>

                <button
                  onClick={confirmPurchase}
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
                  {loading ? "Processing" : "Pay via M-Pesa"}
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
