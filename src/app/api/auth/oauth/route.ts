import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { logActivity, rateLimit } from "@/lib/middleware";
import { setAuthCookies } from "@/lib/auth-cookies";
import { databaseErrorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

const limiter = rateLimit(60_000, 20);

const oauthSchema = z.object({
  accessToken: z.string().min(20, "Missing Google session"),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
} as const;

function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function providerSet(user: {
  app_metadata?: { provider?: unknown; providers?: unknown };
  identities?: Array<{ provider?: string | null }> | null;
}) {
  const providers = new Set<string>();
  const primaryProvider = user.app_metadata?.provider;
  const listedProviders = user.app_metadata?.providers;

  if (typeof primaryProvider === "string") {
    providers.add(primaryProvider);
  }

  if (Array.isArray(listedProviders)) {
    for (const provider of listedProviders) {
      if (typeof provider === "string") providers.add(provider);
    }
  }

  for (const identity of user.identities ?? []) {
    if (identity.provider) providers.add(identity.provider);
  }

  return providers;
}

function nameFromGoogleUser(email: string, metadata: Record<string, unknown>) {
  const fullName = metadata.full_name ?? metadata.name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim().slice(0, 60);
  }

  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .slice(0, 60);
}

function avatarFromGoogleUser(metadata: Record<string, unknown>) {
  const avatar = metadata.avatar_url ?? metadata.picture;
  return typeof avatar === "string" && avatar.startsWith("http") ? avatar : null;
}

export async function POST(req: NextRequest) {
  const limited = limiter(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = oauthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  const supabase = getSupabaseAuthClient();
  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Google sign-in is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabase.auth.getUser(parsed.data.accessToken);

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: "Google sign-in expired. Please try again." },
        { status: 401 }
      );
    }

    const providers = providerSet(data.user);
    if (!providers.has("google")) {
      return NextResponse.json(
        { success: false, error: "Please use a Google account to continue." },
        { status: 401 }
      );
    }

    const email = data.user.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Your Google account does not expose an email address." },
        { status: 422 }
      );
    }

    const metadata = data.user.user_metadata ?? {};
    const name = nameFromGoogleUser(email, metadata);
    const avatarUrl = avatarFromGoogleUser(metadata);

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: userSelect,
    });

    if (existingUser && !existingUser.isActive) {
      return NextResponse.json(
        { success: false, error: "Account suspended. Contact support." },
        { status: 403 }
      );
    }

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            avatarUrl: existingUser.avatarUrl ?? avatarUrl,
          },
          select: userSelect,
        })
      : await prisma.user.create({
          data: {
            name,
            email,
            avatarUrl,
            passwordHash: `oauth:supabase:${data.user.id}`,
            role: "CUSTOMER",
          },
          select: userSelect,
        });

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken(user.id),
    ]);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    await logActivity({
      userId: user.id,
      action: existingUser ? "LOGIN_GOOGLE" : "REGISTER_GOOGLE",
      resource: "users",
      resourceId: user.id,
      req,
    });

    const { isActive: _, ...safeUser } = user;
    const response = NextResponse.json({
      success: true,
      data: { accessToken, user: safeUser },
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    const dbResponse = databaseErrorResponse(error);
    if (dbResponse) return dbResponse;

    console.error("[Google OAuth]", error);
    return NextResponse.json(
      { success: false, error: "Could not complete Google sign-in. Please try again." },
      { status: 500 }
    );
  }
}
