import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { databaseErrorResponse } from "@/lib/api-errors";
import { logActivity, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const galleryImageSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100).transform((value) => value.trim()),
  caption: z.string().max(240).optional().transform((value) => value?.trim() || undefined),
  imageUrl: z.string().url("Upload a valid image first."),
  category: z.string().max(40).optional().transform((value) => value?.trim() || "General"),
  isPublished: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const GET = withAuth(
  async () => {
    try {
      const images = await prisma.galleryImage.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      });

      return NextResponse.json({ success: true, data: images });
    } catch (error) {
      const dbResponse = databaseErrorResponse(error);
      if (dbResponse) return dbResponse;

      console.error("[Admin Gallery GET]", error);
      return NextResponse.json(
        { success: false, error: "Could not load gallery images." },
        { status: 500 }
      );
    }
  },
  ["ADMIN"]
);

export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = galleryImageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 422 }
      );
    }

    try {
      const image = await prisma.galleryImage.create({ data: parsed.data });

      await logActivity({
        userId: req.user.sub,
        action: "CREATE_GALLERY_IMAGE",
        resource: "gallery_images",
        resourceId: image.id,
        details: { title: image.title },
        req,
      });

      return NextResponse.json({ success: true, data: image }, { status: 201 });
    } catch (error) {
      const dbResponse = databaseErrorResponse(error);
      if (dbResponse) return dbResponse;

      console.error("[Admin Gallery POST]", error);
      return NextResponse.json(
        { success: false, error: "Could not save gallery image." },
        { status: 500 }
      );
    }
  },
  ["ADMIN"]
);
