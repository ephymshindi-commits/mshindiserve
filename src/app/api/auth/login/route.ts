import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { rateLimit, logActivity } from "@/lib/middleware";

const limiter = rateLimit(60_000, 10); // 10 attempts per minute

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  const limited = limiter(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, passwordHash: true, isActive: true, createdAt: true,
    },
  });

  // Always verify — prevents timing attacks via early return
  const dummyHash = "$argon2id$v=19$m=65536,t=3,p=4$placeholder";
  const valid = user
    ? await argon2.verify(user.passwordHash, password)
    : await argon2.verify(dummyHash, password).catch(() => false);

  if (!user || !valid) {
    return NextResponse.json(
      { success: false, error: "Invalid email or password" },
      { status: 401 }
    );
  }

  if (!user.isActive) {
    return NextResponse.json(
      { success: false, error: "Account suspended — contact support" },
      { status: 403 }
    );
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    signRefreshToken(user.id),
  ]);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

  await logActivity({ userId: user.id, action: "LOGIN", resource: "users", resourceId: user.id, req });

  const { passwordHash: _, ...safeUser } = user;

  const response = NextResponse.json({ success: true, data: { accessToken, user: safeUser } });

  response.cookies.set("ms_refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
