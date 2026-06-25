import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);

const CURRENT_SCHEME = "pbkdf2";
const CURRENT_DIGEST = "sha256";
const CURRENT_ITERATIONS = 310_000;
const KEY_LENGTH = 32;

export const DUMMY_PASSWORD_HASH =
  "pbkdf2:sha256:310000:codex-fixed-salt:4VWMawNOWsBhfH6Eo2UoVuyWiYtsCMpz9iNt_Livp6g";

export async function hashPassword(password: string) {
  const salt = randomBytes(18).toString("base64url");
  const key = (await pbkdf2Async(
    password,
    salt,
    CURRENT_ITERATIONS,
    KEY_LENGTH,
    CURRENT_DIGEST
  )) as Buffer;

  return [
    CURRENT_SCHEME,
    CURRENT_DIGEST,
    String(CURRENT_ITERATIONS),
    salt,
    key.toString("base64url"),
  ].join(":");
}

export function isPasswordHash(hash: string | null | undefined) {
  return Boolean(hash && (hash.startsWith(`${CURRENT_SCHEME}:`) || hash.startsWith("$argon2")));
}

export async function verifyPassword(password: string, hash: string) {
  if (hash.startsWith(`${CURRENT_SCHEME}:`)) {
    return verifyPbkdf2Password(password, hash);
  }

  if (hash.startsWith("$argon2")) {
    return verifyLegacyArgon2Password(password, hash);
  }

  return false;
}

async function verifyPbkdf2Password(password: string, hash: string) {
  const [scheme, digest, iterationsText, salt, storedKeyText] = hash.split(":");
  const iterations = Number(iterationsText);

  if (
    scheme !== CURRENT_SCHEME ||
    digest !== CURRENT_DIGEST ||
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    !salt ||
    !storedKeyText
  ) {
    return false;
  }

  const storedKey = Buffer.from(storedKeyText, "base64url");
  const candidateKey = (await pbkdf2Async(password, salt, iterations, storedKey.length, digest)) as Buffer;

  return storedKey.length === candidateKey.length && timingSafeEqual(storedKey, candidateKey);
}

async function verifyLegacyArgon2Password(password: string, hash: string) {
  try {
    const argon2 = await import("argon2");
    return await argon2.verify(hash, password).catch(() => false);
  } catch (error) {
    console.warn("[Auth] Legacy argon2 hash could not be verified in this runtime.", error);
    return false;
  }
}
