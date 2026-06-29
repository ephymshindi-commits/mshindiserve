"use client";

import Image from "next/image";
import { ImageIcon, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  deleteImage,
  uploadImageWithProgress,
  type ImageFolder,
} from "@/lib/storage";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 12 * 1024 * 1024;

type ImageUploadProps = {
  currentImageUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
  folder: ImageFolder;
  disabled?: boolean;
};

export function ImageUpload({
  currentImageUrl,
  onUpload,
  onRemove,
  folder,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function openPicker() {
    if (!disabled && !uploading && !removing) inputRef.current?.click();
  }

  function validateFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Use a JPG, PNG, or WEBP image.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Image must be 12MB or smaller.";
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const url = await uploadImageWithProgress(
        file,
        folder,
        currentImageUrl ?? undefined,
        setProgress
      );
      onUpload(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!currentImageUrl) return;

    setRemoving(true);
    setError(null);
    try {
      await deleteImage(currentImageUrl);
      onRemove();
    } catch {
      onRemove();
    } finally {
      setRemoving(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  const busy = uploading || removing;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || busy}
      />

      {currentImageUrl ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative h-48 bg-zinc-100 dark:bg-zinc-800">
            <Image
              src={currentImageUrl}
              alt="Uploaded image preview"
              fill
              sizes="(min-width: 768px) 420px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-2 p-3 sm:flex-row">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled || busy}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || busy}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={openPicker}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled && !busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white px-5 py-8 text-center transition dark:border-zinc-700 dark:bg-zinc-900",
            dragging && "border-amber-500 bg-amber-50 dark:bg-amber-500/10",
            (disabled || busy) && "cursor-not-allowed opacity-60"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
          </div>
          <p className="mt-3 text-sm font-medium text-zinc-950 dark:text-white">
            Drop image here or browse
          </p>
          <p className="mt-1 text-xs text-zinc-500">JPG, PNG, or WEBP up to 12MB</p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
            disabled={disabled || busy}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-3 text-xs font-medium text-white transition hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            <Upload size={14} />
            Browse
          </button>
        </div>
      )}

      {uploading && (
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-amber-600 transition-all"
            style={{ width: `${Math.max(8, progress)}%` }}
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
