import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { databaseErrorResponse } from "@/lib/api-errors";
import { logActivity, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const galleryPatchSchema = z
  .object({
    title: z.string().min(2).max(100).transform((value) => value.trim()).optional(),
    caption: z.string().max(240).nullable().optional(),
    imageUrl: z.string().url().optional(),
    category: z.string().max(40).nullable().optional(),
    isPublished: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
  })
  .transform((value) => {
    const data = { ...value };
    if ("caption" in data) data.caption = data.caption?.trim() || null;
    if ("category" in data) data.category = data.category?.trim() || "General";
    return data;
  });

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = galleryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    try {
      const image = await prisma.galleryImage.update({
        where: { id: params.id },
        data: parsed.data,
      });

      await logActivity({
        userId: req.user.sub,
        action: "UPDATE_GALLERY_IMAGE",
        resource: "gallery_images",
        resourceId: image.id,
        details: { title: image.title },
        req,
      });

      return NextResponse.json({ success: true, data: image });
    } catch (error) {
      const dbResponse = databaseErrorResponse(error);
      if (dbResponse) return dbResponse;

      console.error("[Admin Gallery PATCH]", error);
      return NextResponse.json(
        { success: false, error: "Could not update gallery image." },
        { status: 500 }
      );
    }
  },
  ["ADMIN"]
);

export const DELETE = withAuth(
  async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try {
      const image = await prisma.galleryImage.delete({ where: { id: params.id } });

      await logActivity({
        userId: req.user.sub,
        action: "DELETE_GALLERY_IMAGE",
        resource: "gallery_images",
        resourceId: image.id,
        details: { title: image.title },
        req,
      });

      return NextResponse.json({ success: true, data: image });
    } catch (error) {
      const dbResponse = databaseErrorResponse(error);
      if (dbResponse) return dbResponse;

      console.error("[Admin Gallery DELETE]", error);
      return NextResponse.json(
        { success: false, error: "Could not delete gallery image." },
        { status: 500 }
      );
    }
  },
  ["ADMIN"]
);
