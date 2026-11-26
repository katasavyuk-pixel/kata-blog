/**
 * Vercel Web Analytics inside the /blog zone (26-nov-2026).
 *
 * The Vercel host serves the analytics script and its endpoints at the ROOT
 * of the domain (`/_vercel/insights/…`, or `/<hash>/…` with the hash Vercel
 * puts in the client bundle). On ianexora.com the root belongs to NBI-WEB,
 * which only forwards `/blog/*` to this project, so those requests got
 * NBI-WEB's 404 and no visit was counted.
 *
 * Fix, in two parts:
 * 1. Script and EVERY endpoint (view, event, session, and the generic one)
 *    go through `/blog/_m/…`, which NBI-WEB forwards here; next.config.ts
 *    rewrites that to `/_vercel/insights/…` on this project's own Vercel host
 *    (ORIGEN_VERCEL). All of them are set explicitly because the client
 *    config Vercel inlines at build time brings its own root `viewEndpoint`
 *    and would win over `endpoint`. The path is fixed, not the build hash,
 *    so the server-rendered props and the rewrite can never disagree. The
 *    rewrite must be an absolute URL: Next refuses a relative destination
 *    outside the base path, and `/_vercel/insights` is answered by Vercel's
 *    edge, not by this app.
 * 2. `usePathname()` has no base path, so the page URL sent was
 *    `ianexora.com/glosario` instead of `ianexora.com/blog/glosario`;
 *    `urlEnZona` puts the base path back (in `beforeSend`).
 *
 * `base` is the zone's base path (BASE_PATH, src/config/base-path.ts); it is
 * passed in so next.config.ts can load this file without path aliases.
 * NBI-WEB has no Vercel Analytics and its pages never load this script, so
 * nothing is counted twice and ianexora.com's own pages stay cookie-free and
 * under their own CSP.
 */

/** This project's production host on Vercel; it serves `/_vercel/insights/…` itself. Same one NBI-WEB forwards /blog to. */
export const ORIGEN_VERCEL = "https://kata-ivanovych-blog.vercel.app";

/** The zone's own path for analytics, under the base path. */
export const RUTA_ANALYTICS = "/_m";

/** Props for `<Analytics>`: script and all endpoints inside the zone. */
export function propsAnalytics(base: string) {
  const raiz = `${base}${RUTA_ANALYTICS}`;
  return {
    scriptSrc: `${raiz}/script.js`,
    endpoint: raiz,
    viewEndpoint: `${raiz}/view`,
    eventEndpoint: `${raiz}/event`,
    sessionEndpoint: `${raiz}/session`,
  };
}

/** The rewrite that takes `/blog/_m/…` to `/_vercel/insights/…` on the Vercel host, which serves it. */
export function rewritesAnalytics(base: string, origen: string = ORIGEN_VERCEL) {
  return [
    {
      source: `${base}${RUTA_ANALYTICS}/:path*`,
      destination: `${origen}/_vercel/insights/:path*`,
      basePath: false as const,
    },
  ];
}

/** Puts the base path back into the page URL the analytics script reports. */
export function urlEnZona(url: string, base: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (u.pathname === base || u.pathname.startsWith(`${base}/`)) return url;
  u.pathname = `${base}${u.pathname === "/" ? "" : u.pathname}`;
  return u.toString();
}
