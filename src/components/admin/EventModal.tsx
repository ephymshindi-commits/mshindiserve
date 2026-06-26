"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { Event } from "@/types";

type EventModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: Event | null;
};

type EventForm = {
  title: string;
  description: string;
  date: string;
  venue: string;
  ticketPrice: string;
  totalSeats: string;
  isActive: boolean;
  imageUrl: string;
};

const emptyForm: EventForm = {
  title: "",
  description: "",
  date: "",
  venue: "Fine Breeze Bar & Grill",
  ticketPrice: "",
  totalSeats: "100",
  isActive: true,
  imageUrl: "",
};

function toNairobiInput(date: string | Date) {
  const utc = new Date(date);
  const nairobi = new Date(utc.getTime() + 3 * 60 * 60 * 1000);
  return nairobi.toISOString().slice(0, 16);
}

function nairobiInputToUtc(value: string) {
  return new Date(`${value}:00+03:00`).toISOString();
}

function shillingsFromCents(cents: number) {
  return String(Math.round(cents / 100));
}

export function EventModal({ open, onOpenChange, onSuccess, initialData }: EventModalProps) {
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editing = Boolean(initialData);
  const soldSeats = initialData?.soldSeats ?? 0;

  useEffect(() => {
    if (!open) return;
    setApiError(null);
    setErrors({});
    setForm(
      initialData
        ? {
            title: initialData.title,
            description: initialData.description,
            date: toNairobiInput(initialData.date),
            venue: initialData.venue,
            ticketPrice: shillingsFromCents(initialData.ticketPrice),
            totalSeats: String(initialData.totalSeats),
            isActive: initialData.isActive,
            imageUrl: initialData.imageUrl ?? "",
          }
        : { ...emptyForm, date: toNairobiInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) }
    );
  }, [initialData, open]);

  function setField<K extends keyof EventForm>(key: K, value: EventForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const next: Record<string, string> = {};
    const price = Number(form.ticketPrice);
    const totalSeats = Number(form.totalSeats);

    if (form.title.trim().length < 2) next.title = "Title must be at least 2 characters.";
    if (form.description.trim().length < 5) next.description = "Description must be at least 5 characters.";
    if (!form.date) next.date = "Event date is required.";
    if (form.venue.trim().length < 2) next.venue = "Venue is required.";
    if (!Number.isFinite(price) || price <= 0) next.ticketPrice = "Enter a valid ticket price.";
    if (!Number.isInteger(totalSeats) || totalSeats < Math.max(1, soldSeats)) {
      next.totalSeats = soldSeats > 0 ? `Seats cannot be below ${soldSeats}.` : "Enter a valid seat count.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSubmitting(true);
    setApiError(null);

    const priceShillings = Number(form.ticketPrice);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      date: nairobiInputToUtc(form.date),
      venue: form.venue.trim(),
      ticketPrice: editing ? priceShillings : Math.round(priceShillings * 100),
      totalSeats: Number(form.totalSeats),
      isActive: form.isActive,
      imageUrl: form.imageUrl || null,
    };

    try {
      const res = await fetch(editing ? `/api/events/${initialData?.id}` : "/api/events", {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Could not save event.");

      toast.success(editing ? "Event updated." : "Event created.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save event.";
      setApiError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div>
              <Dialog.Title className="text-base font-semibold text-zinc-950 dark:text-white">
                {editing ? "Edit event" : "Add event"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-zinc-500">
                Manage event details, seats, pricing, and visibility.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" disabled={submitting}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {apiError && <Alert tone="danger" text={apiError} />}
            {editing && soldSeats > 0 && (
              <Alert tone="warning" text={`${soldSeats} ticket(s) sold. Ticket price is locked and total seats cannot go below sold seats.`} />
            )}

            <Field label="Image">
              <ImageUpload folder="events" currentImageUrl={form.imageUrl || null} onUpload={(url) => setField("imageUrl", url)} onRemove={() => setField("imageUrl", "")} disabled={submitting} />
            </Field>
            <Field label="Title" error={errors.title}>
              <input className={inputClass} value={form.title} onChange={(event) => setField("title", event.target.value)} />
            </Field>
            <Field label="Description" error={errors.description}>
              <textarea className={`${inputClass} min-h-24 py-2`} value={form.description} onChange={(event) => setField("description", event.target.value)} />
            </Field>
            <Field label="Date and time" error={errors.date}>
              <input type="datetime-local" className={inputClass} value={form.date} onChange={(event) => setField("date", event.target.value)} />
            </Field>
            <Field label="Venue" error={errors.venue}>
              <input className={inputClass} value={form.venue} onChange={(event) => setField("venue", event.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ticket price (KES)" error={errors.ticketPrice}>
                <input type="number" min="1" className={inputClass} value={form.ticketPrice} onChange={(event) => setField("ticketPrice", event.target.value)} disabled={editing && soldSeats > 0} />
              </Field>
              <Field label="Total seats" error={errors.totalSeats}>
                <input type="number" min={Math.max(1, soldSeats)} className={inputClass} value={form.totalSeats} onChange={(event) => setField("totalSeats", event.target.value)} />
              </Field>
            </div>
            <Toggle label="Active" active={form.isActive} onClick={() => setField("isActive", !form.isActive)} />
          </div>

          <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
            <button onClick={submit} disabled={submitting} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-60">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {editing ? "Save changes" : "Create event"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:disabled:bg-zinc-800";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
      <span className="font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
        {active ? "On" : "Off"}
      </span>
    </button>
  );
}

function Alert({ text, tone }: { text: string; tone: "warning" | "danger" }) {
  return (
    <div className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${tone === "warning" ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
