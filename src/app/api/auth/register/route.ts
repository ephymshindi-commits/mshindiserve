import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { rateLimit, logActivity } from "@/lib/middleware";

const limiter = rateLimit(60_000, 5); // 5 registrations per minute per IP

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, "Enter a valid Kenyan phone number")
    .optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export async function POST(req: NextRequest) {
  // Rate limit
  const limited = limiter(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  const { name, email, phone, password } = parsed.data;

  // Check existing user
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, error: "Email or phone already registered" },
      { status: 409 }
    );
  }

  // Hash password with Argon2id
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash, role: "CUSTOMER" },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });

  // Issue tokens
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    signRefreshToken(user.id),
  ]);

  // Persist refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

  await logActivity({ userId: user.id, action: "REGISTER", resource: "users", resourceId: user.id, req });

  const response = NextResponse.json(
    { success: true, data: { accessToken, user } },
    { status: 201 }
  );

  // HttpOnly refresh token cookie
  response.cookies.set("ms_refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
