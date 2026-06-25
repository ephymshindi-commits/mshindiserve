import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearAuthCookies } from "@/lib/auth-cookies";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("ms_refresh_token")?.value;

  if (token) {
    // Delete this specific refresh token (or all for the user)
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });

  clearAuthCookies(response);

  return response;
}
