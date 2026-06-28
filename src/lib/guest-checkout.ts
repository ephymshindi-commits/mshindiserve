import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import type { JWTPayload } from "@/types";

export const GUEST_CHECKOUT_EMAIL = "guest@mshindiserve.local";

export function extractAuthToken(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.cookies.get("ms_access_token")?.value ?? null;
}

export async function getOptionalAuth(req: NextRequest): Promise<JWTPayload | null> {
  const token = extractAuthToken(req);
  if (!token) return null;

  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function getOrCreateGuestUser() {
  return prisma.user.upsert({
    where: { email: GUEST_CHECKOUT_EMAIL },
    update: { isActive: true },
    create: {
      name: "Guest Customer",
      email: GUEST_CHECKOUT_EMAIL,
      passwordHash: "guest-checkout",
      role: "CUSTOMER",
      isActive: true,
    },
  });
}

export function isGuestCheckoutUser(user: { email: string | null }) {
  return user.email === GUEST_CHECKOUT_EMAIL;
}
