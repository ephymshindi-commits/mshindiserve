import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export type RateLimit = {
  check: (identifier: string) => Promise<NextResponse | null>;
};

export function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function createRateLimit(requests: number, window: Duration): RateLimit | null {
  if (!redis) return null;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `mshindiserve:ratelimit:${requests}:${window}`,
  });

  return {
    async check(identifier: string) {
      let result: Awaited<ReturnType<typeof limiter.limit>>;
      try {
        result = await limiter.limit(identifier);
      } catch (error) {
        console.warn("[Rate limit] Upstash check failed; allowing request.", error);
        return null;
      }

      if (result.success) return null;

      const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.reset),
          },
        }
      );
    },
  };
}

export const loginLimiter = createRateLimit(5, "15m");
export const registerLimiter = createRateLimit(3, "1h");
export const ticketLimiter = createRateLimit(10, "1m");
export const mpesaLimiter = createRateLimit(3, "5m");
export const generalLimiter = createRateLimit(60, "1m");
