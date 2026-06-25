import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Wine } from "lucide-react";
import { BarBrowser } from "@/components/public/BarBrowser";

export const dynamic = "force-dynamic";

export default function BarPage() {
  return (
    <div className="bg-stone-50 dark:bg-zinc-950">
      <section className="relative overflow-hidden bg-zinc-950">
        <Image
          src="https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=1800&q=80"
          alt="Fine Breeze bar counter"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/30" />
        <div className="relative mx-auto max-w-6xl px-4 py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-amber-200 backdrop-blur">
            <Wine size={14} />
            Bar selection
          </div>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Cold pours, curated bottles, late nights.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-zinc-300">
            Browse what is currently available at the bar and restaurant before you arrive.
          </p>
          <Link
            href="/gallery"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-amber-600 px-5 text-sm font-medium text-white transition hover:bg-amber-500"
          >
            See the atmosphere <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <BarBrowser />
      </section>
    </div>
  );
}
