import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { logActivity } from "@/lib/middleware";
import { setAuthCookies } from "@/lib/auth-cookies";
import { databaseErrorResponse } from "@/lib/api-errors";
import { DUMMY_PASSWORD_HASH, isPasswordHash, verifyPassword } from "@/lib/passwords";
import { clientIp, loginLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  const limited = await loginLimiter?.check(clientIp(req));
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

  try {
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        passwordHash: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        createdAt: true,
      },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { success: false, error: `Account locked for ${mins} more minute(s).` },
        { status: 423 }
      );
    }

    const canUsePassword = isPasswordHash(user?.passwordHash);
    const valid =
      user && canUsePassword
        ? await verifyPassword(password, user.passwordHash)
        : await verifyPassword(password, DUMMY_PASSWORD_HASH);

    if (user?.passwordHash.startsWith("oauth:")) {
      return NextResponse.json(
        { success: false, error: "This account uses Google sign-in." },
        { status: 401 }
      );
    }

    if (user && !canUsePassword) {
      return NextResponse.json(
        { success: false, error: "This account needs a password reset. Contact support." },
        { status: 401 }
      );
    }

    if (!user || !valid) {
      if (user && canUsePassword) {
        const failedLoginAttempts = user.failedLoginAttempts + 1;

        if (failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts, lockedUntil },
          });

          return NextResponse.json(
            {
              success: false,
              error: `Account locked for ${LOCKOUT_MINUTES} more minute(s).`,
            },
            { status: 423 }
          );
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts },
        });
      }

      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "Account suspended. Contact support." },
        { status: 403 }
      );
    }

    if (user.failedLoginAttempts !== 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken(user.id),
    ]);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    await logActivity({
      userId: user.id,
      action: "LOGIN",
      resource: "users",
      resourceId: user.id,
      req,
    });

    const {
      passwordHash: _,
      failedLoginAttempts: __,
      lockedUntil: ___,
      ...safeUser
    } = user;
    const response = NextResponse.json({
      success: true,
      data: { accessToken, user: safeUser },
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    const dbResponse = databaseErrorResponse(error);
    if (dbResponse) return dbResponse;

    console.error("[Login]", error);
    return NextResponse.json(
      { success: false, error: "Could not sign in. Please try again." },
      { status: 500 }
    );
  }
}
