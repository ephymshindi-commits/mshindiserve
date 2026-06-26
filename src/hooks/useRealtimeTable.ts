"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export function useRealtimeTable(table: string, queryKey: QueryKey, enabled = true) {
  const queryClient = useQueryClient();
  const queryKeyHash = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`realtime:${table}:${queryKeyHash}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR") {
          console.error(`[Realtime ${table}]`, error);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, queryKey, queryKeyHash, table]);
}
