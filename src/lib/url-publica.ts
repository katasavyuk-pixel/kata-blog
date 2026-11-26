import { siteConfig } from "@/config/site";

/**
 * Absolute public URL for a path of this app (`/gracias?x=1`).
 *
 * Route handlers used to build redirects with `new URL(path, request.url)`.
 * Behind NBI-WEB's rewrite that request arrives on this project's own
 * vercel.app host and without knowing about the /blog prefix, so the reader
 * was sent to the wrong host or to ianexora.com/<path> (NBI-WEB's 404).
 * `siteConfig.url` is the public base (https://ianexora.com/blog).
 */
export function urlPublica(path: string): URL {
  return new URL(`${siteConfig.url}${path}`);
}
