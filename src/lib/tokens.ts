import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/** CSPRNG token (URL-safe). Raw token travels only in the email link. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** sha256 hex — only the hash is stored in the DB. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of two hex digests. */
export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
