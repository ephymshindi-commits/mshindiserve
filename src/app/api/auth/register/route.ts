import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { logActivity, withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";
import { setAuthCookies } from "@/lib/auth-cookies";
import { databaseErrorResponse } from "@/lib/api-errors";
import { hashPassword } from "@/lib/passwords";
import { clientIp, registerLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roles = ["CUSTOMER", "KITCHEN", "RECEPTION", "ADMIN"] as const;
type RegisterRole = (typeof roles)[number];

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
} as const;

type SafeRegisteredUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: RegisterRole;
  createdAt: Date;
};

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
  adminCreate: z.boolean().optional(),
  role: z.enum(roles).optional(),
});

function isAdminCreateRequest(body: unknown) {
  return (
    typeof body === "object" &&
    body !== null &&
    "adminCreate" in body &&
    (body as { adminCreate?: unknown }).adminCreate === true
  );
}

async function insertUserCompat({
  name,
  email,
  phone,
  passwordHash,
  role,
}: {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: RegisterRole;
}) {
  const id = randomUUID();
  const now = new Date();
  const phoneValue = phone ?? null;

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "users" ("id", "name", "email", "phone", "passwordHash", "role", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, '${role}', $6, $7)`,
      id,
      name,
      email,
      phoneValue,
      passwordHash,
      now,
      now
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("updatedAt")) throw error;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "users" ("id", "name", "email", "phone", "passwordHash", "role", "createdAt")
       VALUES ($1, $2, $3, $4, $5, '${role}', $6)`,
      id,
      name,
      email,
      phoneValue,
      passwordHash,
      now
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!user) {
    throw new Error("User was inserted but could not be loaded.");
  }

  return user as SafeRegisteredUser;
}

async function createUserRecord(data: {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: RegisterRole;
}) {
  try {
    const user = await prisma.user.create({
      data,
      select: safeUserSelect,
    });

    return user as SafeRegisteredUser;
  } catch (error) {
    console.warn("[Register] Prisma user.create failed; retrying compatible insert.", error);
    return insertUserCompat(data);
  }
}

async function createAccount(
  req: NextRequest | AuthenticatedRequest,
  body: unknown,
  adminCreate: boolean
) {
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 422 }
    );
  }

  try {
    const { name, email, phone, password } = parsed.data;
    const role = adminCreate ? parsed.data.role ?? "CUSTOMER" : "CUSTOMER";

    // Check existing user
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email or phone already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await createUserRecord({ name, email, phone, passwordHash, role });

    if (adminCreate) {
      await logActivity({
        userId: (req as AuthenticatedRequest).user.sub,
        action: "ADMIN_CREATE_USER",
        resource: "users",
        resourceId: user.id,
        details: { email: user.email, role: user.role },
        req,
      });

      return NextResponse.json({ success: true, data: { user } }, { status: 201 });
    }

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

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (isAdminCreateRequest(body)) {
    const adminCreate = withAuth(
      async (authReq: AuthenticatedRequest) => createAccount(authReq, body, true),
      ["ADMIN"]
    );

    return adminCreate(req, undefined);
  }

  const limited = await registerLimiter?.check(clientIp(req));
  if (limited) return limited;

  return createAccount(req, body, false);
}
