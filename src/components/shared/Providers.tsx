"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionSync />
      {children}
    </QueryClientProvider>
  );
}

function SessionSync() {
  const { isAuthenticated, setUser, clearAuth } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) return;

    let cancelled = false;

    async function loadSession() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;

        const payload = await res.json();
        if (!cancelled && payload?.success && payload.data?.user) {
          setUser(payload.data.user);
        }
      } catch {
        if (!cancelled) clearAuth();
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [clearAuth, isAuthenticated, setUser]);

  return null;
}
