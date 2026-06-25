"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { AuthModal } from "@/components/shared/AuthModal";
import type { User } from "@/types";

export function AuthPage({ defaultTab }: { defaultTab: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const rawNext = searchParams.get("next");
  const next = rawNext?.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  function leave() {
    setOpen(false);
    router.replace("/");
  }

  function success(user: User) {
    setOpen(false);
    if (next.startsWith("/admin") && user.role !== "ADMIN") {
      toast.error("That account is not allowed to access the admin panel.");
      router.replace("/");
      return;
    }

    router.replace(next);
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center px-4 py-16">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
            Secure access
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl dark:text-white">
            Sign in to continue
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Your account keeps food orders, room bookings, and event tickets tied to the right
            guest or team member.
          </p>
        </div>
      </section>

      <AuthModal open={open} onClose={leave} onSuccess={success} defaultTab={defaultTab} />
    </div>
  );
}
