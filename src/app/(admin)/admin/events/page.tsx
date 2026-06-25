import { format } from "date-fns";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { eventSeedData, getDemoEvents } from "@/lib/fallback-data";
import { prisma } from "@/lib/prisma";
import { formatKES } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getEvents() {
  try {
    let events = await prisma.event.findMany({
      orderBy: { date: "asc" },
      include: { tickets: { select: { id: true } } },
    });
    if (events.length === 0) {
      await prisma.event.createMany({ data: eventSeedData(), skipDuplicates: true });
      events = await prisma.event.findMany({
        orderBy: { date: "asc" },
        include: { tickets: { select: { id: true } } },
      });
    }
    return events.length > 0 ? events : getDemoEvents().map((event) => ({ ...event, tickets: [] }));
  } catch (error) {
    console.error("[Admin Events]", error);
    return getDemoEvents().map((event) => ({ ...event, tickets: [] }));
  }
}

export default async function AdminEventsPage() {
  const events = await getEvents();

  return (
    <div>
      <AdminSectionHeader
        title="Events"
        description="Track upcoming events, ticket pricing, and seat availability."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {events.map((event) => {
          const remaining = Math.max(0, event.totalSeats - event.soldSeats);
          const soldPercent = event.totalSeats > 0 ? Math.round((event.soldSeats / event.totalSeats) * 100) : 0;

          return (
            <article key={event.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {format(new Date(event.date), "EEE, d MMM yyyy - h:mm a")}
                  </p>
                  <h2 className="mt-1 font-semibold text-zinc-950 dark:text-white">{event.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">{event.description}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${event.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
                  {event.isActive ? "Active" : "Hidden"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
                  <p className="text-sm font-semibold text-zinc-950 dark:text-white">{event.soldSeats}</p>
                  <p className="text-xs text-zinc-500">Sold</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
                  <p className="text-sm font-semibold text-zinc-950 dark:text-white">{remaining}</p>
                  <p className="text-xs text-zinc-500">Left</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {formatKES(event.ticketPrice)}
                  </p>
                  <p className="text-xs text-zinc-500">Ticket</p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, soldPercent)}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
