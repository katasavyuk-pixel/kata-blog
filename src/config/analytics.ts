/**
 * Vercel Web Analytics inside the /blog zone (26-nov-2026).
 *
 * The Vercel host serves the analytics script and its event endpoint at the
 * ROOT of the domain: `/<hash>/script.js`, `/<hash>/view`, `/<hash>/event`
 * (`<hash>` is `NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH`, set by Vercel at
 * build time; `/_vercel/insights` when it is not set). On ianexora.com the
 * root belongs to NBI-WEB, which only forwards `/blog/*` to this project, so
 * those root paths returned NBI-WEB's 404 and no visit was counted.
 *
 * Fix: the <Analytics> component loads the script and sends the events under
 * the base path (`/blog/<hash>/…`), which NBI-WEB forwards here, and
 * next.config.ts rewrites that path to the root one this project's host
 * serves. `base` is the zone's base path (BASE_PATH, src/config/base-path.ts);
 * it is passed in so next.config.ts can load this file without path aliases.
 * NBI-WEB itself has no Vercel Analytics and its pages never load
 * this script, so nothing is counted twice and ianexora.com's own pages stay
 * cookie-free and under their own CSP.
 */
export function raizAnalytics(env: Record<string, string | undefined> = process.env): string {
  const raiz = (env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH ?? "").trim().replace(/\/+$/, "");
  if (!raiz) return "/_vercel/insights";
  return raiz.startsWith("/") ? raiz : `/${raiz}`;
}

/** Props for `<Analytics>`: script and endpoint inside the zone. */
export function propsAnalytics(base: string, raiz: string = raizAnalytics()): { scriptSrc: string; endpoint: string } {
  return { scriptSrc: `${base}${raiz}/script.js`, endpoint: `${base}${raiz}` };
}

/** The rewrite that takes `/blog/<hash>/…` back to the root path the Vercel host serves. */
export function rewritesAnalytics(base: string, raiz: string = raizAnalytics()) {
  return [{ source: `${base}${raiz}/:path*`, destination: `${raiz}/:path*`, basePath: false as const }];
}
