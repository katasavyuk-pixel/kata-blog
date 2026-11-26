/**
 * The site's own top-level sections, under the `/blog` base path.
 *
 * Since the move to ianexora.com/blog (26-nov-2026) an article lives at
 * `/<slug>` (public: ianexora.com/blog/<slug>), next to these sections, so a
 * post slug must never be one of them: tests/rutas.test.ts compares this list
 * with src/app and with every post slug.
 */
export const SECCIONES = [
  "api",
  "baja",
  "bitacora",
  "cookies",
  "empieza-aqui",
  "enlaces",
  "feed.xml",
  "glosario",
  "gracias",
  "guias",
  "herramientas",
  "lecturas",
  "llms.txt",
  "marketplace",
  "newsletter",
  "noticias",
  "opengraph-image",
  "panel",
  // The retired home prototype (tests/portada-home): never an article.
  "portada",
  "privacidad",
  "radar",
  "reflexiones",
  "robots.txt",
  "sector",
  "sectores",
  "sistemas",
  "sitemap.xml",
  "sobre-mi",
  "tag",
  "trabaja-con-nbi",
  "videos",
] as const;

const SET = new Set<string>(SECCIONES);

/** An article path: one segment, not a section (`/que-es-rag`, not `/marketplace`). */
export function esRutaDeArticulo(pathname: string): boolean {
  const match = /^\/([^/?#]+)$/.exec(pathname);
  return Boolean(match && !SET.has(match[1]));
}
