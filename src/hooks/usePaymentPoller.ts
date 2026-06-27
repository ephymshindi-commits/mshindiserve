"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { PaymentStatus } from "@/types";

type ResourceType = "order" | "booking" | "ticket";
type PollStatus = "idle" | "polling" | "COMPLETED" | "FAILED" | "timeout";

type PaymentStatusResponse = {
  success: boolean;
  data?: {
    status: PaymentStatus;
    mpesaRef: string | null;
    resultDesc: string | null;
    amount: number;
  };
  error?: string;
};

type UsePaymentPollerProps = {
  resourceId?: string | null;
  resourceType: ResourceType;
  enabled: boolean;
  onCompleted: (mpesaRef: string | null) => void;
  onFailed: (reason: string) => void;
};

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_SECONDS = 120;

export function usePaymentPoller({
  resourceId,
  resourceType,
  enabled,
  onCompleted,
  onFailed,
}: UsePaymentPollerProps) {
  const [status, setStatus] = useState<PollStatus>("idle");
  const [secondsRemaining, setSecondsRemaining] = useState(TIMEOUT_SECONDS);
  const completedRef = useRef(onCompleted);
  const failedRef = useRef(onFailed);

  useEffect(() => {
    completedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    failedRef.current = onFailed;
  }, [onFailed]);

  useEffect(() => {
    if (!enabled || !resourceId) {
      setStatus("idle");
      setSecondsRemaining(TIMEOUT_SECONDS);
      return;
    }

    let cancelled = false;
    let elapsedSeconds = 0;

    setStatus("polling");
    setSecondsRemaining(TIMEOUT_SECONDS);

    async function checkStatus() {
      if (!resourceId || cancelled) return;

      try {
        const res = await fetch(
          `/api/payments/status/${resourceId}?type=${resourceType}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );
        const payload = (await res.json()) as PaymentStatusResponse;

        if (!res.ok || !payload.success || !payload.data) return;

        if (payload.data.status === "COMPLETED") {
          cancelled = true;
          setStatus("COMPLETED");
          setSecondsRemaining(Math.max(0, TIMEOUT_SECONDS - elapsedSeconds));
          toast.success(payload.data.mpesaRef ? `Payment confirmed: ${payload.data.mpesaRef}` : "Payment confirmed.");
          completedRef.current(payload.data.mpesaRef);
          return;
        }

        if (payload.data.status === "FAILED") {
          cancelled = true;
          const reason = payload.data.resultDesc ?? "Payment failed. Please try again.";
          setStatus("FAILED");
          failedRef.current(reason);
        }
      } catch {
        // Network errors are intentionally ignored. The next tick will retry.
      }
    }

    void checkStatus();

    const interval = window.setInterval(() => {
      elapsedSeconds += POLL_INTERVAL_MS / 1000;
      const remaining = Math.max(0, TIMEOUT_SECONDS - elapsedSeconds);
      setSecondsRemaining(remaining);

      if (elapsedSeconds >= TIMEOUT_SECONDS) {
        cancelled = true;
        window.clearInterval(interval);
        setStatus("timeout");
        failedRef.current("Payment timed out. Check your M-Pesa messages.");
        return;
      }

      void checkStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, resourceId, resourceType]);

  return {
    status,
    isPolling: status === "polling",
    secondsRemaining,
  };
}
