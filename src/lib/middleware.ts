import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import type { JWTPayload, Role } from "@/types";
import { Prisma } from "@prisma/client";
import { clientIp, generalLimiter } from "@/lib/rate-limit";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload;
}

// Using `any` for ctx — each route defines its own params shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: AuthenticatedRequest, ctx: any) => Promise<NextResponse>;

// ─── Extract Bearer token ─────────────────────────────────────────────────────

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = req.cookies.get("ms_access_token");
  return cookie?.value ?? null;
}

// ─── withAuth middleware ───────────────────────────────────────────────────────

export function withAuth(handler: Handler, requiredRoles?: Role[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: NextRequest, ctx: any) => {
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

    if (requiredRoles && !requiredRoles.includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    (req as AuthenticatedRequest).user = payload;

    try {
      return await handler(req as AuthenticatedRequest, ctx);
    } catch (error) {
      console.error(`[API] ${req.method} ${req.nextUrl.pathname}`, error);
      return NextResponse.json(
        { success: false, error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }
  };
}

// ─── In-memory rate limiter ────────────────────────────────────────────────────

export function rateLimit(windowMs: number = 60_000, max: number = 20) {
  return (req: NextRequest): NextResponse | null => {
    const key = `${clientIp(req)}:${req.method}:${req.nextUrl.pathname}:${windowMs}:${max}`;
    void generalLimiter?.check(key).catch((error) => {
      console.warn("[Rate limit shim]", error);
    });

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
  details?: Prisma.InputJsonValue;  // ← correct Prisma Json type
  req: NextRequest;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details: details ?? undefined,
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
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Credentials": "true",
};
