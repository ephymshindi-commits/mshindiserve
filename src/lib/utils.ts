import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format cents to KES string: 120000 → "KES 1,200" */
export function formatKES(cents: number): string {
  return `KES ${(cents / 100).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

/** Format a date string to "Mon, 22 Jun 2026" */
export function formatDate(date: string | Date): string {
  return format(new Date(date), "EEE, d MMM yyyy");
}

/** Format a date string to "22 Jun" */
export function formatShortDate(date: string | Date): string {
  return format(new Date(date), "d MMM");
}

/** Format a datetime to "14:32" */
export function formatTime(date: string | Date): string {
  return format(new Date(date), "HH:mm");
}

/** "3 minutes ago" */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** Capitalize first letter */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Status badge colors */
export function orderStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PREPARING: "bg-orange-100 text-orange-800",
    READY: "bg-green-100 text-green-800",
    DELIVERED: "bg-zinc-100 text-zinc-600",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-zinc-100 text-zinc-600";
}

export function bookingStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    CHECKED_IN: "bg-green-100 text-green-800",
    CHECKED_OUT: "bg-zinc-100 text-zinc-600",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-zinc-100 text-zinc-600";
}

export function paymentStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-700",
    REFUNDED: "bg-purple-100 text-purple-800",
  };
  return map[status] ?? "bg-zinc-100 text-zinc-600";
}

/** Generate a random order/booking number suffix */
export function generateRef(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
