/**
 * Best-effort in-memory rate limiter (per server instance). Good enough to blunt
 * abuse on the public signup endpoint. For multi-instance production scale, back
 * this with Upstash/Vercel KV instead.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
