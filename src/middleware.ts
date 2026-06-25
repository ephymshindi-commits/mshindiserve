import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_ROUTES = ["/admin"];
const STAFF_ROUTES = ["/staff"];

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
  return NextResponse.redirect(login);
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const role = await getRole(req);

  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    if (role !== "ADMIN") return redirectToLogin(req);
  }

  if (STAFF_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!role || !["ADMIN", "KITCHEN", "RECEPTION"].includes(role)) {
      return redirectToLogin(req);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*"],
};
