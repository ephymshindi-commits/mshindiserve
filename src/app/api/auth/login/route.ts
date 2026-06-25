import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { rateLimit, logActivity } from "@/lib/middleware";
import { setAuthCookies } from "@/lib/auth-cookies";
import { databaseErrorResponse } from "@/lib/api-errors";
import { DUMMY_PASSWORD_HASH, isPasswordHash, verifyPassword } from "@/lib/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = rateLimit(60_000, 10);

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
        createdAt: true,
      },
    });

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

    const { passwordHash: _, ...safeUser } = user;
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
