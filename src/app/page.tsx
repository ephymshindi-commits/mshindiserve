import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MenuCard } from "@/components/public/MenuCard";
import { EventCard } from "@/components/public/EventCard";

export const revalidate = 60;

async function getFeaturedData() {
  try {
    const [menuItems, events] = await Promise.all([
      prisma.menuItem.findMany({
        where: { isFeatured: true, isAvailable: true },
        take: 4,
        orderBy: { sortOrder: "asc" },
      }),
      prisma.event.findMany({
        where: { isActive: true, date: { gte: new Date() } },
        take: 3,
        orderBy: { date: "asc" },
      }),
    ]);

    return { menuItems, events };
  } catch (error) {
    console.error("Database error:", error);
    return { menuItems: [], events: [] };
  }
}

export default async function HomePage() {
  const { menuItems, events } = await getFeaturedData();

  return (
    <div>
      {/* HERO */}
      <section className="relative bg-zinc-950 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-5" />
        <div className="relative max-w-5xl mx-auto px-4 py-20 text-center">
          <span className="inline-block text-amber-500 text-xs font-medium tracking-[3px] uppercase mb-4">
            Fine Breeze Bar & Grill · Westlands, Nairobi
          </span>

          <h1 className="text-4xl md:text-6xl font-semibold text-white leading-tight mb-6">
            Where every meal
            <br />
            <em className="text-amber-500 not-italic">
              becomes a memory
            </em>
          </h1>

          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Award-winning cuisine, curated cocktails, and warm Kenyan hospitality.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/menu"
              className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl"
            >
              Order Now
            </Link>

            <Link
              href="/rooms"
              className="px-8 py-3 border border-zinc-600 text-zinc-300 hover:text-white rounded-xl"
            >
              Book a Room
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 bg-white dark:bg-zinc-900 border-b">
        {[
          { num: "12+", label: "Years serving Nairobi" },
          { num: "4.8★", label: "Google rating" },
          { num: "50+", label: "Menu items" },
          { num: "24", label: "Rooms available" },
        ].map((s, i) => (
          <div key={i} className="py-6 text-center border-r last:border-r-0">
            <div className="text-2xl font-semibold text-amber-600">
              {s.num}
            </div>
            <div className="text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </section>

      {/* FEATURED MENU */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex justify-between mb-6">
          <h2 className="text-xl font-semibold">Popular dishes</h2>

          <Link href="/menu" className="text-amber-600 text-sm">
            Full menu →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {menuItems.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* EVENTS */}
      {events.length > 0 && (
        <section className="bg-zinc-50 py-12">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-semibold">
                Upcoming events
              </h2>

              <Link href="/events" className="text-amber-600 text-sm">
                All events →
              </Link>
            </div>

            <div className="space-y-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-xl font-semibold mb-6">
          What our guests say
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              text: "The food is amazing 🔥",
              name: "James Njenga",
              init: "JN",
              rating: 5,
            },
            {
              text: "Best rooms in Nairobi 💯",
              name: "Amina Wanjiku",
              init: "AW",
              rating: 5,
            },
            {
              text: "Great vibes every weekend 🎶",
              name: "David Mutua",
              init: "DM",
              rating: 4,
            },
          ].map((t, i) => (
            <div key={i} className="border rounded-2xl p-5">
              <div className="text-amber-500 mb-3">
                {"★".repeat(t.rating)}
                {"☆".repeat(5 - t.rating)}
              </div>

              <p className="text-sm mb-4">"{t.text}"</p>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs">
                  {t.init}
                </div>
                <span className="text-sm font-medium">
                  {t.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <section className="bg-zinc-950 text-center py-14">
        <h2 className="text-2xl text-white mb-2">
          Westlands, Nairobi · Kenya
        </h2>
        <p className="text-zinc-500 text-sm">
          Mon–Sun · 11AM – 2AM | +254 700 123 456
        </p>
      </section>
    </div>
  );
}