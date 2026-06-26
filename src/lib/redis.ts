import { Redis } from "@upstash/redis";

let warned = false;

export function getRedis() {
  const hasConfig = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );

  if (!hasConfig) {
    if (!warned) {
      warned = true;
      console.warn("[Redis] Upstash env vars missing. Rate limits are disabled.");
    }
    return null;
  }

  try {
    return Redis.fromEnv();
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn("[Redis] Could not initialize Upstash Redis.", error);
    }
    return null;
  }
}

export const redis = getRedis();
