"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { MenuItem } from "@/types";

const categories = ["GRILL", "DRINKS", "SPECIALS", "SEAFOOD", "STARTERS", "DESSERTS"] as const;

type MenuCategory = (typeof categories)[number];

type MenuItemModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: MenuItem | null;
};

type MenuForm = {
  name: string;
  description: string;
  price: string;
  category: MenuCategory;
  emoji: string;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: string;
  imageUrl: string;
};

const emptyForm: MenuForm = {
  name: "",
  description: "",
  price: "",
  category: "GRILL",
  emoji: "FB",
  isAvailable: true,
  isFeatured: false,
  sortOrder: "0",
  imageUrl: "",
};

function shillingsFromCents(cents: number) {
  return String(Math.round(cents / 100));
}

export function MenuItemModal({ open, onOpenChange, onSuccess, initialData }: MenuItemModalProps) {
  const [form, setForm] = useState<MenuForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editing = Boolean(initialData);

  useEffect(() => {
    if (!open) return;
    setApiError(null);
    setErrors({});
    setForm(
      initialData
        ? {
            name: initialData.name,
            description: initialData.description,
            price: shillingsFromCents(initialData.price),
            category: initialData.category,
            emoji: initialData.emoji,
            isAvailable: initialData.isAvailable,
            isFeatured: initialData.isFeatured,
            sortOrder: String(initialData.sortOrder),
            imageUrl: initialData.imageUrl ?? "",
          }
        : emptyForm
    );
  }, [initialData, open]);

  function setField<K extends keyof MenuForm>(key: K, value: MenuForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const next: Record<string, string> = {};
    const price = Number(form.price);
    const sortOrder = Number(form.sortOrder);

    if (form.name.trim().length < 2) next.name = "Name must be at least 2 characters.";
    if (form.description.trim().length < 5) next.description = "Description must be at least 5 characters.";
    if (!Number.isFinite(price) || price <= 0) next.price = "Enter a valid price.";
    if (!Number.isInteger(sortOrder)) next.sortOrder = "Sort order must be a whole number.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;

    setSubmitting(true);
    setApiError(null);

    const priceShillings = Number(form.price);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: editing ? priceShillings : Math.round(priceShillings * 100),
      category: form.category,
      emoji: form.emoji.trim() || "FB",
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
      sortOrder: Number(form.sortOrder),
      imageUrl: form.imageUrl || null,
    };

    try {
      const res = await fetch(editing ? `/api/menu/${initialData?.id}` : "/api/menu", {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Could not save menu item.");

      toast.success(editing ? "Menu item updated." : "Menu item created.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save menu item.";
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
                {editing ? "Edit menu item" : "Add menu item"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-zinc-500">
                Manage pricing, availability, and menu presentation.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" disabled={submitting}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {apiError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {apiError}
              </div>
            )}

            <Field label="Image">
              <ImageUpload
                folder="menu"
                currentImageUrl={form.imageUrl || null}
                onUpload={(url) => setField("imageUrl", url)}
                onRemove={() => setField("imageUrl", "")}
                disabled={submitting}
              />
            </Field>

            <Field label="Name" error={errors.name}>
              <input className={inputClass} value={form.name} onChange={(event) => setField("name", event.target.value)} />
            </Field>

            <Field label="Description" error={errors.description}>
              <textarea className={`${inputClass} min-h-24 py-2`} value={form.description} onChange={(event) => setField("description", event.target.value)} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price (KES)" error={errors.price}>
                <input type="number" min="1" className={inputClass} value={form.price} onChange={(event) => setField("price", event.target.value)} />
              </Field>
              <Field label="Category">
                <select className={inputClass} value={form.category} onChange={(event) => setField("category", event.target.value as MenuCategory)}>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="Label">
                <input className={inputClass} value={form.emoji} onChange={(event) => setField("emoji", event.target.value)} />
              </Field>
              <Field label="Sort order" error={errors.sortOrder}>
                <input type="number" className={inputClass} value={form.sortOrder} onChange={(event) => setField("sortOrder", event.target.value)} />
              </Field>
            </div>

            <Toggle label="Available" active={form.isAvailable} onClick={() => setField("isAvailable", !form.isAvailable)} />
            <Toggle label="Featured" active={form.isFeatured} onClick={() => setField("isFeatured", !form.isFeatured)} />
          </div>

          <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {editing ? "Save changes" : "Create item"}
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
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
    >
      <span className="font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
        {active ? "On" : "Off"}
      </span>
    </button>
  );
}
