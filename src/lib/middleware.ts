import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import type { JWTPayload, Role } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload;
}

type Handler = (req: AuthenticatedRequest, ctx: { params: Record<string, string> }) => Promise<NextResponse>;

// ─── Extract Bearer token ─────────────────────────────────────────────────────

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  // Also check httpOnly cookie fallback
  const cookie = req.cookies.get("ms_access_token");
  return cookie?.value ?? null;
}

// ─── withAuth middleware ───────────────────────────────────────────────────────
// Wraps a route handler to require a valid JWT

export function withAuth(handler: Handler, requiredRoles?: Role[]) {
  return async (req: NextRequest, ctx: { params: Record<string, string> }) => {
    const token = extractToken(req);

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    let payload: JWTPayload;
    try {
      payload = await verifyAccessToken(token);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Role check
    if (requiredRoles && !requiredRoles.includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    (req as AuthenticatedRequest).user = payload;
    return handler(req as AuthenticatedRequest, ctx);
  };
}

// ─── In-memory rate limiter (swap for Upstash Redis in production) ─────────────

const rateLimitStore = new Map<string, { count: number; reset: number }>();

export function rateLimit(
  windowMs: number = 60_000,
  max: number = 20
) {
  return (req: NextRequest): NextResponse | null => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const key = `${ip}:${req.nextUrl.pathname}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.reset) {
      rateLimitStore.set(key, { count: 1, reset: now + windowMs });
      return null; // ok
    }

    entry.count++;
    if (entry.count > max) {
      return NextResponse.json(
        { success: false, error: "Too many requests — please slow down" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((entry.reset - now) / 1000)),
            "X-RateLimit-Limit": String(max),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
    return null;
  };
}

// ─── Input validation helper ───────────────────────────────────────────────────

export function validationError(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 422 });
}

// ─── Log admin actions ─────────────────────────────────────────────────────────

export async function logActivity({
  userId,
  action,
  resource,
  resourceId,
  details,
  req,
}: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  req: NextRequest;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent") ?? null,
      },
    });
  } catch {
    // Non-blocking — logging should never break the request
  }
}

// ─── Shared CORS headers ───────────────────────────────────────────────────────

export const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL ?? "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Credentials": "true",
};
