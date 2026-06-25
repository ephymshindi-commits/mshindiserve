import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/jwt";
import { setAuthCookies } from "@/lib/auth-cookies";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("ms_refresh_token")?.value;

  if (!token) {
    return NextResponse.json({ success: false, error: "No refresh token" }, { status: 401 });
  }

  let sub: string;
  try {
    ({ sub } = await verifyRefreshToken(token));
  } catch {
    return NextResponse.json({ success: false, error: "Invalid refresh token" }, { status: 401 });
  }

  // Verify token exists in DB (rotation check)
  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
  });

  if (!stored || stored.userId !== sub || stored.expiresAt < new Date()) {
    // Possible token reuse — invalidate all tokens for this user
    await prisma.refreshToken.deleteMany({ where: { userId: sub } });
    return NextResponse.json({ success: false, error: "Refresh token invalid or reused" }, { status: 401 });
  }

  if (!stored.user.isActive) {
    return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });
  }

  // Rotate refresh token
  const [newAccess, newRefresh] = await Promise.all([
    signAccessToken({ sub: stored.user.id, email: stored.user.email, role: stored.user.role }),
    signRefreshToken(stored.user.id),
  ]);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { token } }),
    prisma.refreshToken.create({
      data: {
        token: newRefresh,
        userId: stored.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  const response = NextResponse.json({ success: true, data: { accessToken: newAccess } });

  setAuthCookies(response, newAccess, newRefresh);

  return response;
}
