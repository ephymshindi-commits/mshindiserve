import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roles = ["CUSTOMER", "KITCHEN", "RECEPTION", "ADMIN"] as const;
const roleSchema = z.object({ role: z.enum(roles) });
type RouteContext = { params: { id: string } };

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, { params }: RouteContext) => {
    if (params.id === req.user.sub) {
      return NextResponse.json(
        { success: false, error: "You cannot change your own role." },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (user.role === "ADMIN" && parsed.data.role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: "Cannot demote the last admin." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { role: parsed.data.role },
      select: safeUserSelect,
    });

    await logActivity({
      userId: req.user.sub,
      action: "UPDATE_USER_ROLE",
      resource: "users",
      resourceId: updated.id,
      details: { role: updated.role },
      req,
    });

    return NextResponse.json({ success: true, data: updated });
  },
  ["ADMIN"]
);
