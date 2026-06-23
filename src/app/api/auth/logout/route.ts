import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("ms_refresh_token")?.value;

  if (token) {
    // Delete this specific refresh token (or all for the user)
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });

  response.cookies.set("ms_refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
