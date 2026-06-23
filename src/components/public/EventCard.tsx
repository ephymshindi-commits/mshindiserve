"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Ticket } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ticketsApi, paymentsApi } from "@/lib/api";
import { AuthModal } from "@/components/shared/AuthModal";
import { formatKES } from "@/lib/utils";
import toast from "react-hot-toast";
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

  const remaining = event.totalSeats - event.soldSeats;
  const eventDate = new Date(event.date);

  function handleBuyClick() {
    if (!isAuthenticated) {
      setShowAuth(true);
    } else {
      setShowTicketModal(true);
    }
  }

  async function confirmPurchase() {
    if (!phone.match(/^(\+254|0)[17]\d{8}$/)) {
      toast.error("Enter a valid Safaricom number");
      return;
    }
    setLoading(true);
    try {
      const ticketRes = await ticketsApi.buy(event.id, qty);
      const ticket = ticketRes.data.data;

      await paymentsApi.stkPush({ phoneNumber: phone, ticketId: ticket.id });

      setTicketCode(ticket.ticketCode);
      toast.success("Ticket reserved! Check your phone to complete M-Pesa payment.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Purchase failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
        {/* Date badge */}
        <div className="min-w-[52px] bg-amber-600 text-white rounded-xl p-2 text-center flex-shrink-0">
          <div className="text-xl font-semibold leading-none">{format(eventDate, "d")}</div>
          <div className="text-[10px] uppercase tracking-wider mt-0.5">
            {format(eventDate, "MMM")}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-white">{event.title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{event.description}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-amber-600 font-medium">
              {formatKES(event.ticketPrice)}/person
            </span>
            {remaining < 20 && remaining > 0 && (
              <span className="text-xs text-red-500">{remaining} left</span>
            )}
            {remaining === 0 && (
              <span className="text-xs text-zinc-400">Sold out</span>
            )}
          </div>
        </div>

        {/* Buy CTA */}
        <button
          onClick={handleBuyClick}
          disabled={remaining === 0}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-xl transition-colors flex-shrink-0"
        >
          <Ticket size={13} />
          Buy ticket
        </button>
      </div>

      {/* Auth gate */}
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => { setShowAuth(false); setShowTicketModal(true); }}
      />

      {/* Ticket purchase modal */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm">
            {ticketCode ? (
              // Success state
              <div className="text-center">
                <div className="text-5xl mb-3">🎟️</div>
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Ticket reserved!</h3>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 mb-4">
                  <p className="text-xs text-zinc-500 mb-1">Your ticket code</p>
                  <p className="font-mono font-bold text-amber-600 text-lg tracking-widest">
                    {ticketCode}
                  </p>
                  <p className="text-xs text-zinc-400 mt-2">
                    Complete payment via M-Pesa prompt on your phone
                  </p>
                </div>
                <button
                  onClick={() => { setShowTicketModal(false); setTicketCode(null); }}
                  className="w-full py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              // Purchase form
              <>
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{event.title}</h3>
                <p className="text-sm text-zinc-500 mb-5">
                  {format(eventDate, "EEEE, d MMMM yyyy")} · {event.venue}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1.5">
                      Number of tickets
                    </label>
                    <select
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n} ticket{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1.5">
                      M-Pesa Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254 712 345 678"
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800"
                    />
                  </div>

                  <div className="flex justify-between text-sm font-medium pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span>Total</span>
                    <span className="text-amber-600">{formatKES(event.ticketPrice * qty)}</span>
                  </div>

                  <button
                    onClick={confirmPurchase}
                    disabled={loading}
                    className="w-full py-3 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white text-sm font-medium rounded-xl"
                  >
                    {loading ? "Processing…" : "Pay via M-Pesa"}
                  </button>

                  <button
                    onClick={() => setShowTicketModal(false)}
                    className="w-full text-sm text-zinc-500 hover:text-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
