"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ImageIcon, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { ImageUpload } from "@/components/admin/ImageUpload";
import api from "@/lib/api";
import { deleteImage } from "@/lib/storage";
import type { ApiResponse } from "@/types";

type GalleryImage = {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  category: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

const emptyForm = {
  title: "",
  caption: "",
  category: "General",
  imageUrl: "",
  isPublished: true,
  sortOrder: 0,
};

async function fetchGalleryImages() {
  const res = await api.get<ApiResponse<GalleryImage[]>>("/admin/gallery");
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.error ?? "Could not load gallery images.");
  }
  return res.data.data;
}

export default function AdminGalleryPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const galleryQuery = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: fetchGalleryImages,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const nextErrors: Record<string, string> = {};
      if (form.title.trim().length < 2) nextErrors.title = "Title must be at least 2 characters.";
      if (!form.imageUrl) nextErrors.imageUrl = "Upload an image first.";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) throw new Error("Check the highlighted fields.");

      const res = await api.post<ApiResponse<GalleryImage>>("/admin/gallery", {
        title: form.title.trim(),
        caption: form.caption.trim() || undefined,
        category: form.category.trim() || "General",
        imageUrl: form.imageUrl,
        isPublished: form.isPublished,
        sortOrder: form.sortOrder,
      });

      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error ?? "Could not save gallery image.");
      }

      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Gallery photo added.");
      setForm(emptyForm);
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save gallery image.");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await api.patch<ApiResponse<GalleryImage>>(`/admin/gallery/${id}`, { isPublished });
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error ?? "Could not update gallery photo.");
      }
      return res.data.data;
    },
    onSuccess: (image) => {
      toast.success(image.isPublished ? "Photo published." : "Photo hidden.");
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update gallery photo.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (image: GalleryImage) => {
      const res = await api.delete<ApiResponse<GalleryImage>>(`/admin/gallery/${image.id}`);
      if (!res.data.success) {
        throw new Error(res.data.error ?? "Could not delete gallery photo.");
      }
      await deleteImage(image.imageUrl);
      return image;
    },
    onSuccess: () => {
      toast.success("Gallery photo deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete gallery photo.");
    },
  });

  const images = galleryQuery.data ?? [];

  return (
    <div>
      <AdminSectionHeader
        title="Gallery"
        description="Upload and manage the public gallery shown to guests."
        action={
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-gallery"] })}
            disabled={galleryQuery.isFetching}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <RefreshCcw size={16} className={galleryQuery.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <Plus size={18} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Add gallery photo</h2>
          </div>

          <div className="space-y-4">
            <Field label="Photo" error={errors.imageUrl}>
              <ImageUpload
                folder="gallery"
                currentImageUrl={form.imageUrl || null}
                onUpload={(url) => setForm((current) => ({ ...current, imageUrl: url }))}
                onRemove={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                disabled={createMutation.isPending}
              />
            </Field>

            <Field label="Title" error={errors.title}>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className={inputClass}
                placeholder="Live band night"
              />
            </Field>

            <Field label="Caption">
              <textarea
                value={form.caption}
                onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))}
                className={`${inputClass} min-h-24 py-2`}
                placeholder="A short line guests will see below the image."
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category">
                <input
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className={inputClass}
                  placeholder="Events"
                />
              </Field>
              <Field label="Sort order">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
                  className={inputClass}
                />
              </Field>
            </div>

            <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <span>
                <span className="block text-sm font-medium text-zinc-950 dark:text-white">Publish immediately</span>
                <span className="block text-xs text-zinc-500">Visible on the public gallery page</span>
              </span>
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
                className="h-4 w-4 accent-amber-600"
              />
            </label>

            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-60"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              Save photo
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Gallery photos</h2>
            <p className="mt-1 text-xs text-zinc-500">Published photos appear on the public gallery page.</p>
          </div>

          {galleryQuery.isLoading ? (
            <div className="flex h-56 items-center justify-center text-sm text-zinc-500">
              <Loader2 size={18} className="mr-2 animate-spin" />
              Loading gallery
            </div>
          ) : galleryQuery.isError ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {galleryQuery.error instanceof Error ? galleryQuery.error.message : "Could not load gallery images."}
            </div>
          ) : images.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 px-5 text-center dark:border-zinc-700">
              <ImageIcon size={30} className="text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-zinc-950 dark:text-white">No uploaded photos yet</p>
              <p className="mt-1 text-xs text-zinc-500">Add photos of service, events, rooms, and guest experiences.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {images.map((image) => (
                <article
                  key={image.id}
                  className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="relative h-44 bg-zinc-100 dark:bg-zinc-800">
                    <Image src={image.imageUrl} alt={image.title} fill className="object-cover" sizes="(min-width: 1024px) 25vw, 50vw" />
                    <span
                      className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${
                        image.isPublished
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {image.isPublished ? "Published" : "Hidden"}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">{image.title}</h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          {image.category ?? "General"} - {format(new Date(image.createdAt), "d MMM yyyy")}
                        </p>
                      </div>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                        #{image.sortOrder}
                      </span>
                    </div>
                    {image.caption ? <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{image.caption}</p> : null}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() =>
                          publishMutation.mutate({ id: image.id, isPublished: !image.isPublished })
                        }
                        disabled={publishMutation.isPending}
                        className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        {image.isPublished ? "Hide" : "Publish"}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${image.title}" from the gallery?`)) {
                            deleteMutation.mutate(image);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
