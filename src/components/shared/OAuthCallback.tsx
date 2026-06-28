"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import { normalizeRole, resolvePostAuthRedirect } from "@/lib/role-redirect";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { useAuthStore } from "@/store/authStore";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

function errorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }

  return error instanceof Error ? error.message : "Could not complete Google sign-in.";
}

export function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const code = searchParams.get("code");
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  const next = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function completeGoogleSignIn() {
      if (providerError) {
        setError(providerError);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError(
          "Google sign-in is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
        return;
      }

      try {
        let session = (await supabase.auth.getSession()).data.session;

        if (code) {
          const exchanged = await supabase.auth.exchangeCodeForSession(code);
          if (exchanged.error) throw exchanged.error;
          session = exchanged.data.session;
        }

        if (!session?.access_token) {
          throw new Error("Google sign-in session was not found. Please try again.");
        }

        const res = await authApi.oauth({ accessToken: session.access_token });
        const { user, accessToken } = res.data.data;

        setAuth(user, accessToken);
        toast.success(`Welcome, ${user.name.split(" ")[0]}`);
        router.replace(resolvePostAuthRedirect(normalizeRole(user.role), next));
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        toast.error(message);
      }
    }

    completeGoogleSignIn();
  }, [code, next, providerError, router, setAuth]);

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-stone-50 px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {error ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40">
              <AlertCircle size={22} />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-white">
              Google sign-in needs attention
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{error}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Loader2 size={22} className="animate-spin" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-white">
              Completing Google sign-in
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              We are securing your MshindiServe session now.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
