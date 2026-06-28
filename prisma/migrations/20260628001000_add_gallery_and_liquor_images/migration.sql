ALTER TABLE "liquor_items"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE TABLE IF NOT EXISTS "gallery_images" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "caption" TEXT,
  "imageUrl" TEXT NOT NULL,
  "category" TEXT DEFAULT 'General',
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gallery_images_isPublished_sortOrder_idx"
  ON "gallery_images"("isPublished", "sortOrder");
