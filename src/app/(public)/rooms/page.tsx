import { RoomsBrowser } from "@/components/public/RoomsBrowser";
import { demoRooms, roomSeedData } from "@/lib/fallback-data";
import { prisma } from "@/lib/prisma";
import type { Room } from "@/types";

export const dynamic = "force-dynamic";

async function getRooms(): Promise<Room[]> {
  try {
    let rooms = await prisma.room.findMany({
      where: { isAvailable: true },
      orderBy: [{ sortOrder: "asc" }, { pricePerNight: "asc" }],
    });

    if (rooms.length === 0) {
      await prisma.room.createMany({ data: roomSeedData(), skipDuplicates: true });
      rooms = await prisma.room.findMany({
        where: { isAvailable: true },
        orderBy: [{ sortOrder: "asc" }, { pricePerNight: "asc" }],
      });
    }

    return JSON.parse(JSON.stringify(rooms.length > 0 ? rooms : demoRooms));
  } catch (error) {
    console.error("[Rooms Page]", error);
    return demoRooms;
  }
}

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <div className="bg-stone-50 pb-16 dark:bg-zinc-950">
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
            Stay in Westlands
          </p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
                Book rooms with confidence
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
                Compare rooms, choose dates, and reserve with server-side availability checks
                that prevent double bookings.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Rooms", rooms.length],
                ["Breakfast", "Yes"],
                ["WiFi", "Fast"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-lg font-semibold text-zinc-950 dark:text-white">{value}</p>
                  <p className="text-xs text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        {rooms.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-950 dark:text-white">No rooms are available</p>
            <p className="mt-1 text-sm text-zinc-500">Please check again soon.</p>
          </div>
        ) : (
          <RoomsBrowser rooms={rooms} />
        )}
      </section>
    </div>
  );
}
