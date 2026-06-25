export function normalizePrismaDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) return undefined;

  try {
    const url = new URL(databaseUrl);
    const usesSupabasePooler =
      url.hostname.endsWith(".pooler.supabase.com") || url.hostname.includes("pooler.supabase.com");

    if (usesSupabasePooler) {
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }

      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}
