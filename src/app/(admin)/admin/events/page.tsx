"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, Loader2, Pencil, Plus, RefreshCcw, Ticket, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { EventModal } from "@/components/admin/EventModal";
import { formatKES } from "@/lib/utils";
import type { ApiResponse, Event } from "@/types";

async function readJson<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, error: "The server returned an invalid response." };
  }
}

async function fetchEvents() {
  const res = await fetch("/api/events?past=true&available=false", { credentials: "include" });
  const data = await readJson<Event[]>(res);
  if (!res.ok || !data.success || !data.data) {
    throw new Error(data.error ?? "Could not load events.");
  }
  return data.data;
}

export default function AdminEventsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["admin-events"],
    queryFn: fetchEvents,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Event> }) => {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJson<Event>(res);
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error ?? "Could not update event.");
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update event.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await readJson<Event>(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not delete event.");
      }
      return data.data;
    },
    onSuccess: () => {
      toast.success("Event deleted.");
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete event.");
    },
  });

  function openCreate() {
    setEditingEvent(null);
    setModalOpen(true);
  }

  function openEdit(event: Event) {
    setEditingEvent(event);
    setModalOpen(true);
  }

  function refreshEvents() {
    queryClient.invalidateQueries({ queryKey: ["admin-events"] });
  }

  return (
    <div>
      <AdminSectionHeader
        title="Events"
        description="Manage event images, ticket pricing, seat capacity, and public visibility."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshEvents}
              disabled={eventsQuery.isFetching}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <RefreshCcw size={16} className={eventsQuery.isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-500"
            >
              <Plus size={16} />
              Add event
            </button>
          </div>
        }
      />

      {eventsQuery.isLoading && <EventSkeleton />}

      {eventsQuery.isError && (
        <ErrorState
          message={eventsQuery.error instanceof Error ? eventsQuery.error.message : "Could not load events."}
          onRetry={() => eventsQuery.refetch()}
        />
      )}

      {!eventsQuery.isLoading && !eventsQuery.isError && (eventsQuery.data ?? []).length === 0 && (
        <EmptyState title="No events yet" detail="Create a ticketed event to make it available on the public events page." />
      )}

      {!eventsQuery.isLoading && !eventsQuery.isError && (eventsQuery.data ?? []).length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {(eventsQuery.data ?? []).map((event) => {
            const remaining = Math.max(0, event.totalSeats - event.soldSeats);
            const soldPercent = event.totalSeats > 0 ? Math.round((event.soldSeats / event.totalSeats) * 100) : 0;
            const isPast = new Date(event.date).getTime() < Date.now();
            const isWorking = updateMutation.isPending || deleteMutation.isPending;

            return (
              <article key={event.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="relative h-44 bg-zinc-100 dark:bg-zinc-800">
                  {event.imageUrl ? (
                    <Image src={event.imageUrl} alt={event.title} fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      <CalendarClock size={36} />
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex gap-2">
                    <StatusBadge active={event.isActive} past={isPast} />
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        {format(new Date(event.date), "EEE, d MMM yyyy - h:mm a")}
                      </p>
                      <h2 className="mt-1 truncate font-semibold text-zinc-950 dark:text-white">{event.title}</h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">{event.description}</p>
                    </div>
                    <button
                      onClick={() =>
                        updateMutation.mutate(
                          { id: event.id, payload: { isActive: !event.isActive } },
                          {
                            onSuccess: () => toast.success(event.isActive ? "Event hidden from public page." : "Event is visible on public page."),
                          }
                        )
                      }
                      disabled={isWorking}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
                        event.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {event.isActive ? "Visible" : "Hidden"}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Metric label="Sold" value={event.soldSeats} />
                    <Metric label="Left" value={remaining} />
                    <Metric label="Ticket" value={formatKES(event.ticketPrice)} highlight />
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                      <span>Seat sales</span>
                      <span>{soldPercent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, soldPercent)}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
                      <Ticket size={14} />
                      {event.venue}
                    </div>
                    <div className="flex items-center gap-2">
                      {confirmDeleteId === event.id ? (
                        <>
                          <button
                            onClick={() => deleteMutation.mutate(event.id)}
                            disabled={deleteMutation.isPending}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(event)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            aria-label={`Edit ${event.title}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(event.id)}
                            disabled={event.soldSeats > 0}
                            title={event.soldSeats > 0 ? "Events with sold tickets cannot be deleted." : undefined}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/30 dark:hover:bg-red-500/10"
                            aria-label={`Delete ${event.title}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialData={editingEvent}
        onSuccess={refreshEvents}
      />
    </div>
  );
}

function StatusBadge({ active, past }: { active: boolean; past: boolean }) {
  if (past) {
    return <span className="rounded-full bg-zinc-950/80 px-2.5 py-1 text-xs font-medium text-white">Past</span>;
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-600 text-white" : "bg-zinc-950/80 text-white"}`}>
      {active ? "Active" : "Hidden"}
    </span>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
      <p className={`text-sm font-semibold ${highlight ? "text-amber-700 dark:text-amber-400" : "text-zinc-950 dark:text-white"}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-44 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-5 w-56 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <p className="font-medium">{message}</p>
      <button onClick={onRetry} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-xs font-medium text-white">
        <Loader2 size={14} />
        Retry
      </button>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}
