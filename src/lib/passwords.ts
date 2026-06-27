import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);

const CURRENT_SCHEME = "p2";
const CURRENT_ITERATIONS = 310_000;
const CURRENT_DIGEST = "sha256";
const SALT_LENGTH = 12;
const KEY_LENGTH = 16;
const LEGACY_SCHEME = "pbkdf2";

export const DUMMY_PASSWORD_HASH =
  "p2:310000:codex-fixed-salt:4VWMawNOWsBhfH6Eo2UoVuw";

export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH).toString("base64url");
  const key = (await pbkdf2Async(
    password,
    salt,
    CURRENT_ITERATIONS,
    KEY_LENGTH,
    CURRENT_DIGEST
  )) as Buffer;

  return [
    CURRENT_SCHEME,
    String(CURRENT_ITERATIONS),
    salt,
    key.toString("base64url"),
  ].join(":");
}

export function isPasswordHash(hash: string | null | undefined) {
  return Boolean(
    hash &&
      (hash.startsWith(`${CURRENT_SCHEME}:`) || hash.startsWith(`${LEGACY_SCHEME}:`))
  );
}

export async function verifyPassword(password: string, hash: string) {
  if (hash.startsWith(`${CURRENT_SCHEME}:`)) {
    return verifyCurrentPassword(password, hash);
  }

  if (hash.startsWith(`${LEGACY_SCHEME}:`)) {
    return verifyLegacyPassword(password, hash);
  }

  return false;
}

async function verifyCurrentPassword(password: string, hash: string) {
  const [scheme, iterationsText, salt, storedKeyText] = hash.split(":");
  const iterations = Number(iterationsText);

  if (
    scheme !== CURRENT_SCHEME ||
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    !salt ||
    !storedKeyText
  ) {
    return false;
  }

  const storedKey = Buffer.from(storedKeyText, "base64url");
  const candidateKey = (await pbkdf2Async(
    password,
    salt,
    iterations,
    storedKey.length,
    CURRENT_DIGEST
  )) as Buffer;

  return storedKey.length === candidateKey.length && timingSafeEqual(storedKey, candidateKey);
}

async function verifyLegacyPassword(password: string, hash: string) {
  const [scheme, digest, iterationsText, salt, storedKeyText] = hash.split(":");
  const iterations = Number(iterationsText);

  if (
    scheme !== LEGACY_SCHEME ||
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
