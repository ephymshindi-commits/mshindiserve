import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusSchema = z.object({ isActive: z.boolean() });
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
        { success: false, error: "You cannot suspend yourself." },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { isActive: parsed.data.isActive },
      select: safeUserSelect,
    });

    await logActivity({
      userId: req.user.sub,
      action: parsed.data.isActive ? "ACTIVATE_USER" : "SUSPEND_USER",
      resource: "users",
      resourceId: updated.id,
      details: { isActive: updated.isActive },
      req,
    });

    return NextResponse.json({ success: true, data: updated });
  },
  ["ADMIN"]
);
