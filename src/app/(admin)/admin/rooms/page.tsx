"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, Loader2, Pencil, Plus, RefreshCcw, Trash2, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { RoomModal } from "@/components/admin/RoomModal";
import { formatKES } from "@/lib/utils";
import type { ApiResponse, Room } from "@/types";

async function readJson<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, error: "The server returned an invalid response." };
  }
}

async function fetchRooms() {
  const res = await fetch("/api/rooms?available=false", { credentials: "include" });
  const data = await readJson<Room[]>(res);
  if (!res.ok || !data.success || !data.data) {
    throw new Error(data.error ?? "Could not load rooms.");
  }
  return data.data;
}

export default function AdminRoomsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const roomsQuery = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: fetchRooms,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Room> }) => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJson<Room>(res);
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error ?? "Could not update room.");
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update room.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await readJson<Room>(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not delete room.");
      }
      return data.data;
    },
    onSuccess: () => {
      toast.success("Room deleted.");
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete room.");
    },
  });

  function openCreate() {
    setEditingRoom(null);
    setModalOpen(true);
  }

  function openEdit(room: Room) {
    setEditingRoom(room);
    setModalOpen(true);
  }

  function refreshRooms() {
    queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
  }

  return (
    <div>
      <AdminSectionHeader
        title="Rooms"
        description="Manage room images, nightly rates, amenities, capacity, and public availability."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshRooms}
              disabled={roomsQuery.isFetching}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <RefreshCcw size={16} className={roomsQuery.isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-500"
            >
              <Plus size={16} />
              Add room
            </button>
          </div>
        }
      />

      {roomsQuery.isLoading && <RoomSkeleton />}

      {roomsQuery.isError && (
        <ErrorState
          message={roomsQuery.error instanceof Error ? roomsQuery.error.message : "Could not load rooms."}
          onRetry={() => roomsQuery.refetch()}
        />
      )}

      {!roomsQuery.isLoading && !roomsQuery.isError && (roomsQuery.data ?? []).length === 0 && (
        <EmptyState title="No rooms yet" detail="Create your first room to make accommodation bookable on the public site." />
      )}

      {!roomsQuery.isLoading && !roomsQuery.isError && (roomsQuery.data ?? []).length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(roomsQuery.data ?? []).map((room) => {
            const isWorking = updateMutation.isPending || deleteMutation.isPending;
            return (
              <article key={room.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="relative h-44 bg-zinc-100 dark:bg-zinc-800">
                  {room.imageUrl ? (
                    <Image src={room.imageUrl} alt={room.name} fill className="object-cover" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      <BedDouble size={36} />
                    </div>
                  )}
                  <button
                    onClick={() =>
                      updateMutation.mutate(
                        { id: room.id, payload: { isAvailable: !room.isAvailable } },
                        {
                          onSuccess: () => toast.success(room.isAvailable ? "Room hidden from public page." : "Room is available publicly."),
                        }
                      )
                    }
                    disabled={isWorking}
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm transition disabled:opacity-60 ${
                      room.isAvailable ? "bg-emerald-600 text-white" : "bg-zinc-950/80 text-white"
                    }`}
                  >
                    {room.isAvailable ? "Open" : "Hidden"}
                  </button>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-zinc-950 dark:text-white">{room.name}</h2>
                      <p className="mt-1 line-clamp-3 text-sm leading-6 text-zinc-500">{room.description}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-amber-700 dark:text-amber-400">{formatKES(room.pricePerNight)}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      <Users size={13} />
                      {room.capacity} guests
                    </span>
                    {room.amenities.slice(0, 4).map((amenity) => (
                      <span key={amenity} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                        {amenity}
                      </span>
                    ))}
                    {room.amenities.length > 4 && (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        +{room.amenities.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    {confirmDeleteId === room.id ? (
                      <>
                        <button
                          onClick={() => deleteMutation.mutate(room.id)}
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
                          onClick={() => openEdit(room)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          aria-label={`Edit ${room.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(room.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                          aria-label={`Delete ${room.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <RoomModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialData={editingRoom}
        onSuccess={refreshRooms}
      />
    </div>
  );
}

function RoomSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-44 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
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
