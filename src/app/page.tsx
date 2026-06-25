import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, CalendarDays, Camera, MapPin, ShoppingBag, Wine } from "lucide-react";
import { EventCard } from "@/components/public/EventCard";
import { MenuCard } from "@/components/public/MenuCard";
import { demoMenuItems, eventSeedData, getDemoEvents, menuSeedData } from "@/lib/fallback-data";
import { prisma } from "@/lib/prisma";
import type { Event, MenuItem } from "@/types";

export const dynamic = "force-dynamic";

async function getFeaturedData(): Promise<{ menuItems: MenuItem[]; events: Event[] }> {
  try {
    let [menuItems, events] = await Promise.all([
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

    if (menuItems.length === 0) {
      await prisma.menuItem.createMany({ data: menuSeedData(), skipDuplicates: true });
      menuItems = await prisma.menuItem.findMany({
        where: { isFeatured: true, isAvailable: true },
        take: 4,
        orderBy: { sortOrder: "asc" },
      });
    }

    if (events.length === 0) {
      await prisma.event.createMany({ data: eventSeedData(), skipDuplicates: true });
      events = await prisma.event.findMany({
        where: { isActive: true, date: { gte: new Date() } },
        take: 3,
        orderBy: { date: "asc" },
      });
    }

    return {
      menuItems: JSON.parse(JSON.stringify(menuItems.length > 0 ? menuItems : demoMenuItems.slice(0, 4))),
      events: JSON.parse(JSON.stringify(events.length > 0 ? events : getDemoEvents())),
    };
  } catch (error) {
    console.error("[Home Page]", error);
    return { menuItems: demoMenuItems.slice(0, 4), events: getDemoEvents() };
  }
}

export default async function HomePage() {
  const { menuItems, events } = await getFeaturedData();

  return (
    <div className="bg-stone-50 dark:bg-zinc-950">
      <section className="relative overflow-hidden bg-zinc-950">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1800&q=80"
            alt="Fine dining table at Fine Breeze"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/35" />
        </div>

        <div className="relative mx-auto grid min-h-[620px] max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-amber-200 backdrop-blur">
              <MapPin size={13} />
              Fine Breeze Bar & Grill, Westlands
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Good food, cold drinks, restful rooms.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300 md:text-lg">
              Fine Breeze brings together grilled favorites, a lively bar, comfortable stays,
              and weekend events in Westlands.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/menu"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-amber-600 px-5 text-sm font-medium text-white transition hover:bg-amber-500"
              >
                Order food <ShoppingBag size={16} />
              </Link>
              <Link
                href="/rooms"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 px-5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Book a room <BedDouble size={16} />
              </Link>
              <Link
                href="/bar"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 px-5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                View bar <Wine size={16} />
              </Link>
              <Link
                href="/events"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 px-5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Buy tickets <CalendarDays size={16} />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Grill", "Fresh daily"],
                ["Bar", "Cold pours"],
                ["Rooms", "Quiet stays"],
                ["Events", "Weekend plans"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white/10 p-4">
                  <p className="text-lg font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs text-zinc-300">{label}</p>
                </div>
              ))}
            </div>
            <Link
              href="/gallery"
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-medium text-zinc-950 transition hover:bg-amber-50"
            >
              See the place <Camera size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-6 md:grid-cols-4">
          {[
            ["12+", "Years serving Nairobi"],
            ["4.8", "Guest rating"],
            ["Bar", "Open late"],
            ["24/7", "Online reservations"],
          ].map(([value, label]) => (
            <div key={label} className="p-4 text-center">
              <p className="text-2xl font-semibold text-zinc-950 dark:text-white">{value}</p>
              <p className="mt-1 text-xs text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
              Popular dishes
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">
              Guest favorites
            </h2>
          </div>
          <Link href="/menu" className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-400">
            Full menu <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {menuItems.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="bg-white py-12 dark:bg-zinc-900/40">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                Upcoming events
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">
                Nights to remember
              </h2>
            </div>
            <Link href="/events" className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-400">
              All events <ArrowRight size={15} />
            </Link>
          </div>

          <div className="space-y-5">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["James Njenga", "The grill platter was excellent and the service was sharp."],
            ["Amina Wanjiku", "Clean rooms, calm night, and breakfast was ready on time."],
            ["David Mutua", "Great music, good drinks, and an easy place to bring friends."],
          ].map(([name, text]) => (
            <div key={name} className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 text-sm font-semibold text-amber-600">★★★★★</div>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">"{text}"</p>
              <p className="mt-4 text-sm font-medium text-zinc-950 dark:text-white">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-zinc-950 py-12 text-center">
        <h2 className="text-xl font-semibold text-white">Fine Breeze Bar & Grill</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Westlands, Nairobi - Open daily 11AM to 2AM - +254 700 123 456
        </p>
      </footer>
    </div>
  );
}
