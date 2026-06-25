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

  if (message.includes("prepared statement") && message.includes("already exists")) {
    return "Supabase pooler needs Prisma PgBouncer mode. Redeploy the latest code or add ?pgbouncer=true&connection_limit=1 to DATABASE_URL.";
  }

  if (message.includes("The table") && message.includes("does not exist")) {
    return "Database tables are missing. Run `npx prisma db push` against your Supabase project.";
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
