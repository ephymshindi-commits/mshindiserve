import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MenuCard } from "@/components/public/MenuCard";
import { EventCard } from "@/components/public/EventCard";
import { formatKES } from "@/lib/utils";

export const revalidate = 60; // ISR: revalidate every 60s

async function getFeaturedData() {
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
}

export default async function HomePage() {
  const { menuItems, events } = await getFeaturedData();

  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative bg-zinc-950 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-5" />
        <div className="relative max-w-5xl mx-auto px-4 py-20 text-center">
          <span className="inline-block text-amber-500 text-xs font-medium tracking-[3px] uppercase mb-4">
            Fine Breeze Bar & Grill · Westlands, Nairobi
          </span>
          <h1 className="text-4xl md:text-6xl font-semibold text-white leading-tight mb-6">
            Where every meal
            <br />
            <em className="text-amber-500 not-italic">becomes a memory</em>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Award-winning cuisine, curated cocktails, and warm Kenyan
            hospitality — all in one place.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/menu"
              className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
            >
              Order Now
            </Link>
            <Link
              href="/rooms"
              className="px-8 py-3 bg-transparent border border-zinc-600 hover:border-zinc-400 text-zinc-300 hover:text-white font-medium rounded-xl transition-colors"
            >
              Book a Room
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {[
          { num: "12+", label: "Years serving Nairobi" },
          { num: "4.8★", label: "Google rating" },
          { num: "50+", label: "Menu items" },
          { num: "24", label: "Rooms available" },
        ].map((s, i) => (
          <div
            key={i}
            className="py-6 px-4 text-center border-r border-zinc-100 dark:border-zinc-800 last:border-r-0"
          >
            <div className="text-2xl font-semibold text-amber-600">{s.num}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── FEATURED MENU ── */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Popular dishes
          </h2>
          <Link
            href="/menu"
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            Full menu →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {menuItems.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* ── EVENTS ── */}
      {events.length > 0 && (
        <section className="bg-zinc-50 dark:bg-zinc-900/50 py-12">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Upcoming events
              </h2>
              <Link
                href="/events"
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
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

      {/* ── TESTIMONIALS ── */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">
          What our guests say
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { text: "The nyama choma here is unlike anything in Nairobi. Perfectly seasoned, generous portions.", name: "James Njenga", init: "JN", rating: 5 },
            { text: "Booked a room for the weekend — spotless, comfortable, and the breakfast buffet is incredible.", name: "Amina Wanjiku", init: "AW", rating: 5 },
            { text: "Live music on Fridays is everything. Great vibe, attentive staff, solid cocktails.", name: "David Mutua", init: "DM", rating: 4 },
          ].map((t, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5"
            >
              <div className="text-amber-500 text-sm mb-3">
                {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                "{t.text}"
              </p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-medium">
                  {t.init}
                </div>
                <span className="text-sm font-medium text-zinc-900 dark:text-white">{t.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA / CONTACT ── */}
      <section className="bg-zinc-950 text-center py-14 px-4">
        <p className="text-xs tracking-[3px] text-amber-500 uppercase mb-3">Find us</p>
        <h2 className="text-2xl font-semibold text-white mb-2">Westlands, Nairobi · Kenya</h2>
        <p className="text-zinc-500 text-sm">
          Mon–Sun · 11:00 AM – 2:00 AM &nbsp;|&nbsp; +254 700 123 456
        </p>
      </section>
    </div>
  );
}
