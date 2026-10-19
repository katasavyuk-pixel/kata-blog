/**
 * Signed download links, so the button in an email actually works.
 *
 * `/api/download` used to authorise on the `nbi_subscriber` cookie alone. That
 * cookie is set in whatever browser clicked the confirmation link — but the
 * download button is clicked from a mail client's webview, or on a phone when
 * the confirmation happened on a laptop. No cookie, so the reader was bounced to
 * `/recursos?need_email=…`, a parameter the page ignored. The lead magnet has
 * been undeliverable by email since it was built.
 *
 * A signature travels in the URL, so it survives the trip. It does not replace
 * the authorisation check: the route still looks the address up and requires
 * `status = 'confirmed'`, so a link held by someone who has since unsubscribed
 * stops working. That live check is what makes this different from a bearer
 * token that is valid forever.
 *
 * Rotating DOWNLOAD_LINK_SECRET invalidates every link already sitting in an
 * inbox. That is the intended revocation mechanism, and the cost of using it.
 */

import { createHmac } from "node:crypto";
import { safeEqualHex } from "@/lib/tokens";

/** Matches the `nbi_subscriber` cookie lifetime: a mail read a week later works. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string | undefined {
  return process.env.DOWNLOAD_LINK_SECRET;
}

export function isDownloadSigningConfigured(): boolean {
  return Boolean(secret());
}

function sign(slug: string, email: string, exp: number, key: string): string {
  return createHmac("sha256", key)
    .update(`${slug}|${email}|${exp}`)
    .digest("hex");
}

/**
 * Absolute, signed download URL — or null when no secret is configured, in
 * which case callers fall back to the plain cookie-gated link.
 */
export function signedDownloadUrl(
  siteUrl: string,
  slug: string,
  email: string,
  now = Date.now(),
): string | null {
  const key = secret();
  if (!key) return null;

  const exp = now + TTL_MS;
  const params = new URLSearchParams({
    slug,
    e: email,
    exp: String(exp),
    sig: sign(slug, email, exp, key),
  });
  return `${siteUrl}/api/download?${params.toString()}`;
}

/** Fails closed: no secret, expired, or malformed → false. */
export function verifyDownloadSignature(
  slug: string,
  email: string,
  exp: string | null,
  sig: string | null,
  now = Date.now(),
): boolean {
  const key = secret();
  if (!key || !exp || !sig) return false;

  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  return safeEqualHex(sig, sign(slug, email, expiresAt, key));
}
