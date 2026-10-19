/**
 * Auth for the funnel panel.
 *
 * A signed session cookie issued by a password POST. Not Supabase Auth: that is
 * Fase 3 of the roadmap, it is explicitly not being built yet, and it drags in
 * the `profiles` table design. Not HTTP Basic either — no logout, no way to rate
 * limit an attempt cleanly, and browsers cache the credential oddly. Not a
 * `?key=` in the query string, which would end up in analytics, Referer headers
 * and browser history.
 *
 * The precedent is already in the repo: /api/newsletter/send protects a
 * dangerous route with an env secret and disables itself when the secret is
 * missing. This adds a session so the secret is not pasted on every navigation.
 *
 * Node runtime only (`node:crypto`). That is why the gate lives in the page and
 * not in middleware.ts, which runs on Edge where this module cannot load.
 */

import { createHmac } from "node:crypto";
import { hashToken, safeEqualHex } from "@/lib/tokens";

export const PANEL_COOKIE = "nbi_panel";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string | undefined {
  return process.env.ADMIN_PANEL_SECRET;
}

/** No secret → the panel is off, not open. Same posture as the send endpoint. */
export function isPanelConfigured(): boolean {
  return Boolean(secret());
}

/**
 * Constant-time password check.
 *
 * Both sides are hashed first so the compared buffers are always the same
 * length — otherwise the comparison leaks the secret's length.
 */
export function verifyPassword(input: string): boolean {
  const key = secret();
  if (!key) return false;
  return safeEqualHex(hashToken(input), hashToken(key));
}

function sign(exp: number, key: string): string {
  return createHmac("sha256", key).update(`panel:${exp}`).digest("hex");
}

export function issueSession(now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const exp = now + TTL_MS;
  return `${exp}.${sign(exp, key)}`;
}

export function verifySession(
  value: string | undefined,
  now = Date.now(),
): boolean {
  const key = secret();
  if (!key || !value) return false;

  const [rawExp, sig] = value.split(".");
  if (!rawExp || !sig) return false;

  const exp = Number(rawExp);
  if (!Number.isFinite(exp) || exp <= now) return false;

  return safeEqualHex(sig, sign(exp, key));
}

export const PANEL_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/panel",
  maxAge: TTL_MS / 1000,
};
