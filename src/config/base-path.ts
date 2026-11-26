/**
 * The blog lives under ianexora.com/blog (migration approved by Kata on
 * 26-nov-2026: «Blog de Nexora Business Intelligence en ianexora.com/blog»).
 *
 * This app is a Next multi-zone: `basePath` in next.config.ts puts every route
 * under `/blog`, and NBI-WEB rewrites `ianexora.com/blog/*` to this project.
 * Next adds the prefix by itself to <Link>, `redirect()` and the router. It
 * does NOT add it to: `fetch("/api/…")` from the browser, plain `<a href>`,
 * `NextResponse.redirect(new URL(…))`, `next/image` local `src`, cookie
 * `path`s and files under public/ referenced by hand. Those go through
 * `conBase()`.
 *
 * Paths inside this app are written WITHOUT the prefix (`/marketplace`,
 * `/<slug>`); `siteConfig.url` already carries it (`https://ianexora.com/blog`),
 * so `${siteConfig.url}${path}` is the public absolute URL.
 */
export const BASE_PATH = "/blog";

/** Prefixes an app-relative path with the base path, once. Absolute URLs pass through. */
export function conBase(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`) || path.startsWith(`${BASE_PATH}?`) || path.startsWith(`${BASE_PATH}#`)) {
    return path;
  }
  return `${BASE_PATH}${path === "/" ? "" : path}` || BASE_PATH;
}

/** Public origin of the site (ianexora.com), where NBI-WEB owns everything outside /blog. */
export const NBI_ORIGIN = "https://ianexora.com";

/**
 * Turns a link written for the old site (kata.ianexora.com) into one that
 * works inside this zone: `/blog/<slug>` was the article permalink and is now
 * `/<slug>`; `/sobre-mi` became NBI's author page. Anything else is returned
 * unchanged. Used by the MDX `a` override so old content keeps linking right
 * without a redirect hop.
 */
export function rutaInterna(href: string): string {
  if (href === "/blog" || href.startsWith("/blog?") || href.startsWith("/blog#")) {
    return `/lecturas${href.slice("/blog".length)}`;
  }
  if (href.startsWith("/blog/")) return href.slice("/blog".length);
  if (href === "/sobre-mi" || href.startsWith("/sobre-mi#") || href.startsWith("/sobre-mi?")) {
    return `${NBI_ORIGIN}/sobre-katalin-savyuk${href.slice("/sobre-mi".length)}`;
  }
  return href;
}

/**
 * The same for HTML rendered from markdown (newsletter editions, the build
 * log, the monthly news): root-relative `href`/`src` written for the old site
 * get the base path, so they do not escape the zone into ianexora.com's own
 * routes. Absolute URLs and anchors are left alone.
 */
export function htmlConBase(html: string): string {
  return html.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, (_, atributo: string, ruta: string) => {
    const destino = atributo === "href" ? rutaInterna(ruta) : ruta;
    return `${atributo}="${conBase(destino)}"`;
  });
}
