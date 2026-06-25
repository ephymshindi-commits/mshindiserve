import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_ROUTES = ["/admin"];
const STAFF_ROUTES = ["/staff"];
const API_ROUTES = ["/api"];

const apiRateLimitStore = new Map<string, { count: number; reset: number }>();

function securityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-DNS-Prefetch-Control", "on");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.ip ||
    "unknown"
  );
}

function apiLimitFor(pathname: string, method: string) {
  if (pathname.startsWith("/api/auth/register")) return { windowMs: 60_000, max: 8 };
  if (pathname.startsWith("/api/auth/login")) return { windowMs: 60_000, max: 15 };
  if (pathname.startsWith("/api/auth/oauth")) return { windowMs: 60_000, max: 20 };
  if (pathname.startsWith("/api/payments")) return { windowMs: 60_000, max: 120 };
  if (method !== "GET") return { windowMs: 60_000, max: 90 };
  return { windowMs: 60_000, max: 180 };
}

function checkApiBurstLimit(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!API_ROUTES.some((route) => pathname.startsWith(route))) return null;

  const now = Date.now();
  const { windowMs, max } = apiLimitFor(pathname, req.method);
  const key = `${clientIp(req)}:${req.method}:${pathname}`;
  const entry = apiRateLimitStore.get(key);

  if (apiRateLimitStore.size > 5000) {
    for (const [storedKey, storedEntry] of apiRateLimitStore.entries()) {
      if (now > storedEntry.reset) apiRateLimitStore.delete(storedKey);
    }
  }

  if (!entry || now > entry.reset) {
    apiRateLimitStore.set(key, { count: 1, reset: now + windowMs });
    return null;
  }

  entry.count += 1;
  if (entry.count <= max) return null;

  return NextResponse.json(
    { success: false, error: "Too many requests. Please slow down." },
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

async function getRole(req: NextRequest) {
  const token = req.cookies.get("ms_access_token")?.value;
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!token || !secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  const login = new URL("/login", url);
  login.searchParams.set("next", `${url.pathname}${url.search}`);
  return securityHeaders(NextResponse.redirect(login));
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const limited = checkApiBurstLimit(req);
  if (limited) return securityHeaders(limited);

  const needsAdmin = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const needsStaff = STAFF_ROUTES.some((route) => pathname.startsWith(route));
  if (!needsAdmin && !needsStaff) return securityHeaders(NextResponse.next());

  const role = await getRole(req);

  if (needsAdmin) {
    if (role !== "ADMIN") return redirectToLogin(req);
  }

  if (needsStaff) {
    if (!role || !["ADMIN", "KITCHEN", "RECEPTION"].includes(role)) {
      return redirectToLogin(req);
    }
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/api/:path*"],
};
