import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "mshindiserve-assets";
const PATH_PATTERN = /^(menu|events|rooms|logos)\/[0-9]+-[0-9a-f-]+\.webp$/i;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase storage service role is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseStoragePath(req: NextRequest, key = "path") {
  const path = req.nextUrl.searchParams.get(key);
  if (!path || !PATH_PATTERN.test(path)) return null;
  return path;
}

export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    const path = parseStoragePath(req);
    if (!path) {
      return NextResponse.json({ success: false, error: "Invalid upload path." }, { status: 422 });
    }

    const existingPath = parseStoragePath(req, "existingPath");
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("image/webp")) {
      return NextResponse.json({ success: false, error: "Only WEBP uploads are accepted." }, { status: 415 });
    }

    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ success: false, error: "Image must be 5MB or smaller." }, { status: 413 });
    }

    try {
      const supabase = getSupabaseAdmin();

      if (existingPath && existingPath !== path) {
        const { error } = await supabase.storage.from(BUCKET).remove([existingPath]);
        if (error) console.warn("[Storage] Could not delete old image.", error);
      }

      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
        contentType: "image/webp",
        upsert: false,
      });

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message || "Image upload failed." },
          { status: 502 }
        );
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return NextResponse.json({ success: true, data: { url: data.publicUrl } });
    } catch (error) {
      console.error("[Storage Upload]", error);
      return NextResponse.json(
        { success: false, error: "Image upload failed." },
        { status: 500 }
      );
    }
  },
  ["ADMIN"]
);

export const DELETE = withAuth(
  async (req: AuthenticatedRequest) => {
    const path = parseStoragePath(req);
    if (!path) {
      return NextResponse.json({ success: false, error: "Invalid image path." }, { status: 422 });
    }

    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) console.warn("[Storage Delete]", error);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.warn("[Storage Delete]", error);
      return NextResponse.json({ success: true });
    }
  },
  ["ADMIN"]
);
