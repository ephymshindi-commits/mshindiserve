import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roles = ["CUSTOMER", "KITCHEN", "RECEPTION", "ADMIN"] as const;

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    const role = req.nextUrl.searchParams.get("role");
    const search = req.nextUrl.searchParams.get("search")?.trim();

    const parsedRole = role ? z.enum(roles).safeParse(role) : null;
    if (role && !parsedRole?.success) {
      return NextResponse.json({ success: false, error: "Invalid role filter" }, { status: 422 });
    }

    const users = await prisma.user.findMany({
      where: {
        ...(parsedRole?.success ? { role: parsedRole.data } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    return NextResponse.json({ success: true, data: users });
  },
  ["ADMIN"]
);
