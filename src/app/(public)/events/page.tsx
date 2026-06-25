import { EventCard } from "@/components/public/EventCard";
import { eventSeedData, getDemoEvents } from "@/lib/fallback-data";
import { prisma } from "@/lib/prisma";
import type { Event } from "@/types";

export const dynamic = "force-dynamic";

async function getEvents(): Promise<Event[]> {
  try {
    let events = await prisma.event.findMany({
      where: { isActive: true, date: { gte: new Date() } },
      orderBy: { date: "asc" },
    });

    if (events.length === 0) {
      await prisma.event.createMany({ data: eventSeedData(), skipDuplicates: true });
      events = await prisma.event.findMany({
        where: { isActive: true, date: { gte: new Date() } },
        orderBy: { date: "asc" },
      });
    }

    return JSON.parse(JSON.stringify(events.length > 0 ? events : getDemoEvents()));
  } catch (error) {
    console.error("[Events Page]", error);
    return getDemoEvents();
  }
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="bg-stone-50 pb-16 dark:bg-zinc-950">
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
            Live calendar
          </p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
                Events and ticketing
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
                Reserve tickets for live nights, festivals, and guest experiences. Seat
                availability is tracked in the database as tickets are reserved.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Events", events.length],
                ["Tickets", "Live"],
                ["Venue", "Westlands"],
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

      <section className="mx-auto max-w-6xl space-y-5 px-4 py-8">
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-950 dark:text-white">No upcoming events</p>
            <p className="mt-1 text-sm text-zinc-500">Check back soon for the next experience.</p>
          </div>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </section>
    </div>
  );
}
