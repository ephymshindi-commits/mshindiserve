import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { rateLimit, logActivity } from "@/lib/middleware";
import { setAuthCookies } from "@/lib/auth-cookies";
import { databaseErrorResponse } from "@/lib/api-errors";
import { hashPassword } from "@/lib/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = rateLimit(60_000, 5); // 5 registrations per minute per IP

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, "Enter a valid Kenyan phone number")
    .optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export async function POST(req: NextRequest) {
  // Rate limit
  const limited = limiter(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  try {
    const { name, email, phone, password } = parsed.data;

    // Check existing user
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email or phone already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, phone, passwordHash, role: "CUSTOMER" },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });

    // Issue tokens
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken(user.id),
    ]);

    // Persist refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    await logActivity({ userId: user.id, action: "REGISTER", resource: "users", resourceId: user.id, req });

    const response = NextResponse.json(
      { success: true, data: { accessToken, user } },
      { status: 201 }
    );

    setAuthCookies(response, accessToken, refreshToken);

    return response;
  } catch (error) {
    const dbResponse = databaseErrorResponse(error);
    if (dbResponse) return dbResponse;

    console.error("[Register]", error);
    return NextResponse.json(
      { success: false, error: "Could not create account. Please try again." },
      { status: 500 }
    );
  }
}
