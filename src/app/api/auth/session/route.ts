import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { databaseErrorResponse } from "@/lib/api-errors";
import { verifyAccessToken } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signedOutResponse = NextResponse.json({
  success: true,
  data: { user: null },
});

export async function GET(req: NextRequest) {
  const token = req.cookies.get("ms_access_token")?.value;

  if (!token) {
    return signedOutResponse;
  }

  let sub: string;
  try {
    ({ sub } = await verifyAccessToken(token));
  } catch {
    return signedOutResponse;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      return signedOutResponse;
    }

    const { isActive: _, ...safeUser } = user;
    return NextResponse.json({ success: true, data: { user: safeUser } });
  } catch (error) {
    const dbResponse = databaseErrorResponse(error);
    if (dbResponse) return dbResponse;

    console.error("[Session]", error);
    return signedOutResponse;
  }
}
