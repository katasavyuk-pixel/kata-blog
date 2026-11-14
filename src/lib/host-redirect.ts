/**
 * Canonical host for the blog. blog.ianexora.com is not in DNS and is not
 * attached to the Vercel project today, so this only runs after that hostname
 * is pointed here (see the PR notes). Until then the helper is a no-op.
 *
 * Kept pure so the 301 can be tested without spinning up middleware.
 */
export const CANONICAL_HOST = "kata.ianexora.com";

export const HOSTS_TO_REDIRECT = new Set([
  "blog.ianexora.com",
  "www.blog.ianexora.com",
]);

export function hostToRedirect(hostHeader: string | null): string | null {
  const host = hostHeader?.split(":")[0]?.trim().toLowerCase();
  if (!host || !HOSTS_TO_REDIRECT.has(host)) return null;
  return CANONICAL_HOST;
}

/** Absolute https URL on the canonical host, keeping path, query and hash. */
export function canonicalBlogUrl(requestUrl: string, hostHeader: string | null): string | null {
  const target = hostToRedirect(hostHeader);
  if (!target) return null;
  const url = new URL(requestUrl);
  url.protocol = "https:";
  url.hostname = target;
  url.port = "";
  return url.toString();
}
