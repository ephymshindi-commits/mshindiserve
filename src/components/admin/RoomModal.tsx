"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { Room } from "@/types";

type RoomModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: Room | null;
};

type RoomForm = {
  name: string;
  description: string;
  pricePerNight: string;
  capacity: string;
  amenities: string[];
  amenityInput: string;
  emoji: string;
  isAvailable: boolean;
  imageUrl: string;
};

const emptyForm: RoomForm = {
  name: "",
  description: "",
  pricePerNight: "",
  capacity: "2",
  amenities: [],
  amenityInput: "",
  emoji: "RM",
  isAvailable: true,
  imageUrl: "",
};

function shillingsFromCents(cents: number) {
  return String(Math.round(cents / 100));
}

export function RoomModal({ open, onOpenChange, onSuccess, initialData }: RoomModalProps) {
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editing = Boolean(initialData);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setApiError(null);
    setForm(
      initialData
        ? {
            name: initialData.name,
            description: initialData.description,
            pricePerNight: shillingsFromCents(initialData.pricePerNight),
            capacity: String(initialData.capacity),
            amenities: initialData.amenities,
            amenityInput: "",
            emoji: initialData.emoji,
            isAvailable: initialData.isAvailable,
            imageUrl: initialData.imageUrl ?? "",
          }
        : emptyForm
    );
  }, [initialData, open]);

  function setField<K extends keyof RoomForm>(key: K, value: RoomForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addAmenity(raw = form.amenityInput) {
    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    setForm((current) => ({
      ...current,
      amenities: Array.from(new Set([...current.amenities, ...parts])),
      amenityInput: "",
    }));
  }

  function removeAmenity(amenity: string) {
    setForm((current) => ({
      ...current,
      amenities: current.amenities.filter((item) => item !== amenity),
    }));
  }

  function validate() {
    const next: Record<string, string> = {};
    const price = Number(form.pricePerNight);
    const capacity = Number(form.capacity);

    if (form.name.trim().length < 2) next.name = "Name must be at least 2 characters.";
    if (form.description.trim().length < 5) next.description = "Description must be at least 5 characters.";
    if (!Number.isFinite(price) || price <= 0) next.pricePerNight = "Enter a valid nightly price.";
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) next.capacity = "Capacity must be 1 to 10.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    addAmenity();
    if (!validate()) return;

    setSubmitting(true);
    setApiError(null);

    const priceShillings = Number(form.pricePerNight);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      pricePerNight: editing ? priceShillings : Math.round(priceShillings * 100),
      capacity: Number(form.capacity),
      amenities: form.amenities,
      emoji: form.emoji.trim() || "RM",
      isAvailable: form.isAvailable,
      imageUrl: form.imageUrl || null,
    };

    try {
      const res = await fetch(editing ? `/api/rooms/${initialData?.id}` : "/api/rooms", {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Could not save room.");

      toast.success(editing ? "Room updated." : "Room created.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save room.";
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
                {editing ? "Edit room" : "Add room"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-zinc-500">
                Manage room pricing, amenities, and public availability.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" disabled={submitting}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {apiError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{apiError}</div>}
            <Field label="Image">
              <ImageUpload folder="rooms" currentImageUrl={form.imageUrl || null} onUpload={(url) => setField("imageUrl", url)} onRemove={() => setField("imageUrl", "")} disabled={submitting} />
            </Field>
            <Field label="Name" error={errors.name}>
              <input className={inputClass} value={form.name} onChange={(event) => setField("name", event.target.value)} />
            </Field>
            <Field label="Description" error={errors.description}>
              <textarea className={`${inputClass} min-h-24 py-2`} value={form.description} onChange={(event) => setField("description", event.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nightly price (KES)" error={errors.pricePerNight}>
                <input type="number" min="1" className={inputClass} value={form.pricePerNight} onChange={(event) => setField("pricePerNight", event.target.value)} />
              </Field>
              <Field label="Capacity" error={errors.capacity}>
                <input type="number" min="1" max="10" className={inputClass} value={form.capacity} onChange={(event) => setField("capacity", event.target.value)} />
              </Field>
            </div>
            <Field label="Amenities">
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  value={form.amenityInput}
                  onChange={(event) => setField("amenityInput", event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addAmenity();
                    }
                  }}
                  placeholder="WiFi, Breakfast..."
                />
                <button type="button" onClick={() => addAmenity()} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-amber-600">
                  <Plus size={16} />
                </button>
              </div>
              {form.amenities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.amenities.map((amenity) => (
                    <button key={amenity} type="button" onClick={() => removeAmenity(amenity)} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 hover:bg-red-50 hover:text-red-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {amenity} x
                    </button>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Label">
              <input className={inputClass} value={form.emoji} onChange={(event) => setField("emoji", event.target.value)} />
            </Field>
            <Toggle label="Available" active={form.isAvailable} onClick={() => setField("isAvailable", !form.isAvailable)} />
          </div>

          <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
            <button onClick={submit} disabled={submitting} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-60">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {editing ? "Save changes" : "Create room"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";

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
