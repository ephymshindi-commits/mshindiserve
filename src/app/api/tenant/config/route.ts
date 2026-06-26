import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const revalidate = 3600;

const tenantConfigSchema = z.object({
  businessName: z.string().min(2).max(120).optional(),
  tagline: z.string().max(180).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  currency: z.string().min(2).max(8).optional(),
  currencySymbol: z.string().min(1).max(12).optional(),
  mpesaShortcode: z.string().max(20).nullable().optional(),
  supportPhone: z.string().max(40).nullable().optional(),
  supportEmail: z.string().email().nullable().optional(),
  address: z.string().max(180).nullable().optional(),
  timezone: z.string().min(2).max(80).optional(),
  features: z.record(z.boolean()).optional(),
});

async function getOrCreateConfig() {
  const existing = await prisma.tenantConfig.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.tenantConfig.create({ data: {} });
}

export async function GET() {
  try {
    const config = await getOrCreateConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error("[Tenant Config GET]", error);
    return NextResponse.json(
      { success: false, error: "Could not load tenant config." },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(
  async (req: AuthenticatedRequest) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = tenantConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    const existing = await prisma.tenantConfig.findFirst({ orderBy: { createdAt: "asc" } });
    const config = existing
      ? await prisma.tenantConfig.update({
          where: { id: existing.id },
          data: parsed.data,
        })
      : await prisma.tenantConfig.create({ data: parsed.data });

    await logActivity({
      userId: req.user.sub,
      action: "UPDATE_TENANT_CONFIG",
      resource: "tenant_config",
      resourceId: config.id,
      details: { businessName: config.businessName },
      req,
    });

    return NextResponse.json({ success: true, data: config });
  },
  ["ADMIN"]
);
