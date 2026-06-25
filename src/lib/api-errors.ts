import { NextResponse } from "next/server";

export function databaseConfigError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("db.project.supabase.co")) {
    return "DATABASE_URL still uses the placeholder Supabase host. Replace it with your real Supabase pooler connection string.";
  }

  if (message.includes("Can't reach database server")) {
    return "Database is not reachable. Check DATABASE_URL in .env.local.";
  }

  if (message.includes("Authentication failed against database server")) {
    return "Database credentials are invalid. Update DATABASE_URL with your Supabase database password.";
  }

  if (message.includes("Environment variable not found: DATABASE_URL")) {
    return "DATABASE_URL is missing from the environment.";
  }

  return null;
}

export function databaseErrorResponse(error: unknown) {
  const friendlyError = databaseConfigError(error);
  if (!friendlyError) return null;

  console.error("[Database config]", error);
  return NextResponse.json(
    {
      success: false,
      error: friendlyError,
    },
    { status: 503 }
  );
}
