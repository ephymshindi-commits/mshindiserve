import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type GalleryCard = {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
};

const fallbackGallery: GalleryCard[] = [
  {
    id: "dinner-service",
    title: "Dinner service",
    caption: "Grills, sides, and table service through the evening.",
    imageUrl: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "weekend-events",
    title: "Weekend events",
    caption: "Live music, comedy nights, and private celebrations.",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "bar-counter",
    title: "Bar counter",
    caption: "Cold beers, cocktails, wines, and premium spirits.",
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "rooms",
    title: "Rooms",
    caption: "Clean, calm rooms for overnight stays and weekend breaks.",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "outdoor-tables",
    title: "Outdoor tables",
    caption: "A relaxed place for lunch, drinks, and after-work meetups.",
    imageUrl: "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "private-occasions",
    title: "Private occasions",
    caption: "Birthdays, corporate dinners, and intimate celebrations.",
    imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
  },
];

async function getGalleryImages(): Promise<GalleryCard[]> {
  try {
    const images = await prisma.galleryImage.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, caption: true, imageUrl: true },
    });

    return images.length > 0 ? images : fallbackGallery;
  } catch (error) {
    console.warn("[Gallery] Using fallback images.", error);
    return fallbackGallery;
  }
}

export default async function GalleryPage() {
  const gallery = await getGalleryImages();

  return (
    <div className="bg-stone-50 dark:bg-zinc-950">
      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
          Gallery
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 md:text-6xl dark:text-white">
          Food, rooms, music, and moments at Fine Breeze.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-400">
          A glimpse of the service, atmosphere, and events guests come back for.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-14 sm:grid-cols-2 lg:grid-cols-3">
        {gallery.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative h-64">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">{item.title}</h2>
              {item.caption ? <p className="mt-1 text-sm leading-6 text-zinc-500">{item.caption}</p> : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
