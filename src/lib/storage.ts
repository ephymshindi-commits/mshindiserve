"use client";

export const BUCKET = "mshindiserve-assets";
export type ImageFolder = "menu" | "events" | "rooms" | "logos" | "gallery" | "liquor";

function publicStorageBase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Supabase storage is not configured.");
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
}

export function imagePathFromUrl(url: string) {
  try {
    const base = publicStorageBase();
    if (!url.startsWith(base)) return null;
    return decodeURIComponent(url.slice(base.length));
  } catch {
    return null;
  }
}

export function publicImageUrl(path: string) {
  return `${publicStorageBase()}${path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export function createImagePath(folder: ImageFolder) {
  return `${folder}/${Date.now()}-${crypto.randomUUID()}.webp`;
}

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longestSide = Math.max(bitmap.width, bitmap.height);
  const scale = longestSide > 1200 ? 1200 / longestSide : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare image.");

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not compress image."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      0.85
    );
  });
}

export async function deleteImage(url: string): Promise<void> {
  try {
    const path = imagePathFromUrl(url);
    if (!path) return;

    const res = await fetch(`/api/admin/storage?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) console.warn("[Storage] Could not delete image.", await res.text());
  } catch (error) {
    console.warn("[Storage] Could not delete image.", error);
  }
}

export async function uploadImage(
  file: File,
  folder: ImageFolder,
  existingUrl?: string
): Promise<string> {
  const path = createImagePath(folder);
  const blob = await compressImage(file);
  const existingPath = existingUrl ? imagePathFromUrl(existingUrl) : null;

  const params = new URLSearchParams({ path });
  if (existingPath) params.set("existingPath", existingPath);

  const res = await fetch(`/api/admin/storage?${params.toString()}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "image/webp" },
    body: blob,
  });

  const payload = await res.json();
  if (!res.ok || !payload.success) {
    throw new Error(payload.error ?? "Image upload failed.");
  }

  return payload.data.url;
}

export async function uploadImageWithProgress(
  file: File,
  folder: ImageFolder,
  existingUrl: string | undefined,
  onProgress: (progress: number) => void
): Promise<string> {
  const path = createImagePath(folder);
  const blob = await compressImage(file);
  const existingPath = existingUrl ? imagePathFromUrl(existingUrl) : null;

  const params = new URLSearchParams({ path });
  if (existingPath) params.set("existingPath", existingPath);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/storage?${params.toString()}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "image/webp");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && payload.success) {
          onProgress(100);
          resolve(payload.data.url);
          return;
        }

        reject(new Error(payload.error ?? "Image upload failed."));
      } catch {
        reject(new Error(xhr.responseText || "Image upload failed."));
      }
    };

    xhr.onerror = () => reject(new Error("Image upload failed."));
    xhr.send(blob);
  });
}
