"use client";

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { BedDouble, CalendarDays, CheckCircle2, Loader2, Smartphone, Users, Wifi, X } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { bookingsApi, paymentsApi } from "@/lib/api";
import { formatKES } from "@/lib/utils";
import { roomImage } from "@/lib/visuals";
import type { Room } from "@/types";

type ConfirmedBooking = {
  id: string;
  bookingNumber: string;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  mpesaRef?: string | null;
  message?: string;
};

function dateInput(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay));
}

export function RoomsBrowser({ rooms }: { rooms: Room[] }) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [checkIn, setCheckIn] = useState(dateInput(1));
  const [checkOut, setCheckOut] = useState(dateInput(2));
  const [guests, setGuests] = useState(1);
  const [phone, setPhone] = useState("");
  const [specialReqs, setSpecialReqs] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const total = selectedRoom ? selectedRoom.pricePerNight * nights : 0;

  function startBooking(room: Room) {
    setSelectedRoom(room);
    setGuests(Math.min(room.capacity, Math.max(1, guests)));
  }

  function closeBooking() {
    setSelectedRoom(null);
    setConfirmedBooking(null);
    setLoading(false);
    setSpecialReqs("");
    setPhone("");
  }

  async function submitBooking() {
    if (!selectedRoom) return;

    const normalizedPhone = phone.replace(/\s/g, "");
    if (!/^(\+254|0)[17]\d{8}$/.test(normalizedPhone)) {
      toast.error("Enter a valid Safaricom number");
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      toast.error("Check-out must be after check-in");
      return;
    }

    setLoading(true);
    try {
      const bookingRes = await bookingsApi.create({
        roomId: selectedRoom.id,
        checkIn,
        checkOut,
        guests,
        specialReqs: specialReqs.trim() || undefined,
      });
      const booking = bookingRes.data.data;
      const nextBooking: ConfirmedBooking = {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        paymentStatus: booking.paymentStatus ?? "PENDING",
        message: "Booking reserved. Complete payment to confirm your stay.",
      };

      setConfirmedBooking(nextBooking);

      try {
        const paymentRes = await paymentsApi.stkPush({
          phoneNumber: normalizedPhone,
          bookingId: booking.id,
        });
        setConfirmedBooking({
          ...nextBooking,
          message:
            paymentRes.data.data?.message ??
            "Booking reserved. Check your phone to complete payment.",
        });
        toast.success("Booking reserved. Check your phone to complete payment.");
      } catch (paymentError: any) {
        setConfirmedBooking({
          ...nextBooking,
          message:
            paymentError?.response?.data?.error ??
            "M-Pesa is unavailable. Use simulated payment to finish the demo.",
        });
        toast.error("M-Pesa is unavailable. You can simulate payment success.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  async function simulateBookingPayment() {
    if (!confirmedBooking) return;

    setLoading(true);
    try {
      const res = await paymentsApi.simulate({
        bookingId: confirmedBooking.id,
        phoneNumber: phone.replace(/\s/g, "") || undefined,
      });
      const payment = res.data.data;
      setConfirmedBooking({
        ...confirmedBooking,
        paymentStatus: payment.paymentStatus,
        mpesaRef: payment.mpesaRef,
        message: "Payment completed. Your room is confirmed.",
      });
      toast.success("Booking payment completed.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Could not simulate payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {rooms.map((room) => (
          <article
            key={room.id}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative h-56 bg-zinc-100 dark:bg-zinc-800">
              <Image
                src={roomImage(room)}
                alt={room.name}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-zinc-700 shadow-sm backdrop-blur dark:bg-zinc-950/80 dark:text-zinc-200">
                Up to {room.capacity} guest{room.capacity === 1 ? "" : "s"}
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">{room.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {room.description}
                  </p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-base font-semibold text-amber-700 dark:text-amber-400">
                    {formatKES(room.pricePerNight)}
                  </p>
                  <p className="text-xs text-zinc-500">per night</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {room.amenities.slice(0, 5).map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <Wifi size={12} />
                    {amenity}
                  </span>
                ))}
              </div>

              <button
                onClick={() => startBooking(room)}
                disabled={!room.isAvailable}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                <BedDouble size={16} />
                Reserve room
              </button>
            </div>
          </article>
        ))}
      </div>

      <Dialog.Root open={Boolean(selectedRoom)} onOpenChange={(open) => !open && closeBooking()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-5 shadow-2xl dark:bg-zinc-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-base font-semibold text-zinc-950 dark:text-white">
                  {confirmedBooking ? "Booking reserved" : selectedRoom?.name}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-zinc-500">
                  {confirmedBooking?.paymentStatus === "COMPLETED"
                    ? "Your stay is confirmed."
                    : confirmedBooking
                    ? "Complete payment from your phone to confirm your stay."
                    : "Choose your dates and reserve securely with M-Pesa."}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            {confirmedBooking ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {confirmedBooking.paymentStatus === "COMPLETED" ? (
                    <CheckCircle2 size={26} />
                  ) : (
                    <Smartphone size={24} />
                  )}
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-xs text-zinc-500">Booking number</p>
                  <p className="mt-1 font-mono text-lg font-bold tracking-widest text-amber-700 dark:text-amber-400">
                    {confirmedBooking.bookingNumber}
                  </p>
                  <p className="mt-2 text-xs font-medium text-zinc-500">
                    Payment: {confirmedBooking.paymentStatus}
                  </p>
                  {confirmedBooking.mpesaRef ? (
                    <p className="mt-1 text-xs text-zinc-500">Ref: {confirmedBooking.mpesaRef}</p>
                  ) : null}
                </div>
                {confirmedBooking.message ? (
                  <p className="text-sm leading-6 text-zinc-500">{confirmedBooking.message}</p>
                ) : null}
                {confirmedBooking.paymentStatus !== "COMPLETED" ? (
                  <button
                    onClick={simulateBookingPayment}
                    disabled={loading}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {loading ? "Completing" : "Simulate payment success"}
                  </button>
                ) : null}
                <button
                  onClick={closeBooking}
                  className="h-11 w-full rounded-lg bg-zinc-950 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Check-in">
                    <input
                      type="date"
                      min={dateInput(0)}
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Check-out">
                    <input
                      type="date"
                      min={checkIn}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Guests">
                    <div className="relative">
                      <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="number"
                        min={1}
                        max={selectedRoom?.capacity ?? 1}
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </Field>
                  <Field label="M-Pesa phone">
                    <div className="relative">
                      <Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+254 712 345 678"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </Field>
                </div>

                <Field label="Special requests">
                  <textarea
                    value={specialReqs}
                    onChange={(e) => setSpecialReqs(e.target.value)}
                    rows={3}
                    placeholder="Late arrival, airport pickup, extra towels..."
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </Field>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <CalendarDays size={15} />
                    {nights} night{nights === 1 ? "" : "s"}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>Total due</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {formatKES(total)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={submitBooking}
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <BedDouble size={16} />}
                  {loading ? "Reserving" : "Reserve and pay"}
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
