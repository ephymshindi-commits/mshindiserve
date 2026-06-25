import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { demoRooms, roomSeedData } from "@/lib/fallback-data";
import { prisma } from "@/lib/prisma";
import { formatKES } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getRooms() {
  try {
    let rooms = await prisma.room.findMany({
      orderBy: [{ sortOrder: "asc" }, { pricePerNight: "asc" }],
      include: {
        bookings: {
          where: { status: { notIn: ["CANCELLED", "CHECKED_OUT"] } },
          select: { id: true },
        },
      },
    });
    if (rooms.length === 0) {
      await prisma.room.createMany({ data: roomSeedData(), skipDuplicates: true });
      rooms = await prisma.room.findMany({
        orderBy: [{ sortOrder: "asc" }, { pricePerNight: "asc" }],
        include: {
          bookings: {
            where: { status: { notIn: ["CANCELLED", "CHECKED_OUT"] } },
            select: { id: true },
          },
        },
      });
    }
    return rooms.length > 0 ? rooms : demoRooms.map((room) => ({ ...room, bookings: [] }));
  } catch (error) {
    console.error("[Admin Rooms]", error);
    return demoRooms.map((room) => ({ ...room, bookings: [] }));
  }
}

export default async function AdminRoomsPage() {
  const rooms = await getRooms();

  return (
    <div>
      <AdminSectionHeader
        title="Rooms"
        description="Review room inventory, rates, capacity, and active reservations."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <article key={room.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-zinc-950 dark:text-white">{room.name}</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">{room.description}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${room.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {room.isAvailable ? "Open" : "Closed"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">{room.capacity}</p>
                <p className="text-xs text-zinc-500">Guests</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">{room.bookings.length}</p>
                <p className="text-xs text-zinc-500">Active</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {formatKES(room.pricePerNight)}
                </p>
                <p className="text-xs text-zinc-500">Night</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
