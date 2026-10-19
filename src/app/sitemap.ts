import { REGALO } from "@/config/regalo";
import type { MetadataRoute } from "next";
import {
  allPosts,
  esIndexable,
  getEditoriales,
  getNoticias,
  getPost,
  getPostsByEstante,
  zonasConContenido,
  type Post,
} from "@/lib/posts";
import { RUTA_POR_ESTANTE } from "@/config/taxonomy";
import { COURSE_SLUGS } from "@/config/course";
import { REVISADO } from "@/config/revisiones";
import { entradasBitacora } from "@/lib/bitacora";
import { ACTIVOS } from "@/lib/catalogo";
import { glossary } from "@/lib/glossary";
import { sentIssues } from "@/lib/newsletter-archive";
import { mesesPublicados, rutaDeMes, semanasDelMes } from "@/lib/mensual";
import { siteConfig } from "@/config/site";

/**
 * Every `lastModified` here is the day the content of that page last changed,
 * written as YYYY-MM-DD. Never the build instant.
 *
 * The current date tells a crawler "this changed just now" on every build. It is
 * not a rounding error, it is the sitemap asserting a change that did not
 * happen, and it trains crawlers to ignore the field: on 17-oct-2026 an
 * external audit found 18 of 57 URLs carrying the build instant. So:
 *   - a listing dates from the newest thing it lists;
 *   - a glossary term from its own `updated`;
 *   - a hand-written page from `REVISADO` (src/config/revisiones.ts);
 *   - a route with no date at all goes without `lastModified` rather than
 *     with an invented one.
 * No `changeFrequency` or `priority`: Google ignores both, and they were the
 * same guesses on every route.
 */

const DIA_EN_MADRID = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" });

/**
 * The calendar day of a content date, in Madrid, where the content is dated: a
 * `YYYY-MM-DD` stays as is; a timestamp (Velite's midnight UTC, a log entry's
 * full time) becomes the day it was there.
 */
const dia = (fecha: string | Date) =>
  typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : DIA_EN_MADRID.format(new Date(fecha));

/** The newest day among some dates, or undefined when there are none. */
function newestOf(fechas: (string | Date)[]): string | undefined {
  return fechas.map(dia).sort().at(-1);
}

const fechaDe = (p: Post) => p.updated ?? p.date;
const fechasDe = (posts: Post[]) => posts.map(fechaDe);

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const entry = (ruta: string, lastModified: string | undefined): MetadataRoute.Sitemap[number] =>
    lastModified ? { url: `${base}${ruta}`, lastModified } : { url: `${base}${ruta}` };

  // The home shows the newest pieces of every kind, news included: when a
  // daily edition lands on it, its visible content did change.
  const allNewest = newestOf(fechasDe(allPosts));
  const curso = COURSE_SLUGS.map((slug) => getPost(slug)).filter((p): p is Post => Boolean(p));

  const staticRoutes: MetadataRoute.Sitemap = [
    entry("/", allNewest),
    entry("/marketplace", newestOf(ACTIVOS.map((item) => item.activo.publicado))),
    entry("/sistemas", newestOf(fechasDe(getPostsByEstante("sistemas")))),
    // The archive carries no news any more, so a daily edition must not mark /blog as changed.
    entry("/blog", newestOf(fechasDe(getEditoriales()))),
    entry("/noticias", newestOf(fechasDe(getNoticias()))),
    entry("/empieza-aqui", newestOf(fechasDe(curso))),
    entry("/newsletter", newestOf(sentIssues.map((issue) => issue.date))),
    entry("/glosario", newestOf(Object.values(glossary).map((term) => term.updated))),
    entry("/herramientas", REVISADO["/herramientas"]),
    entry("/videos", REVISADO["/videos"]),
    entry("/bitacora", newestOf(entradasBitacora.map((e) => e.fecha))),
    entry("/sobre-mi", REVISADO["/sobre-mi"]),
    entry("/trabaja-con-nbi", REVISADO["/trabaja-con-nbi"]),
    entry("/herramientas/no-me-da-la-vida", REVISADO["/herramientas/no-me-da-la-vida"]),
    entry(REGALO.ficha.href, REVISADO["/herramientas/ficha-para-tu-ia"]),
    entry("/privacidad", REVISADO["/privacidad"]),
    entry("/cookies", REVISADO["/cookies"]),
  ];

  // /guias and /reflexiones exist only while there is something on them; an
  // empty one answers 404 and has no business here.
  const zonaRoutes = zonasConContenido().map((estante) =>
    entry(RUTA_POR_ESTANTE[estante], newestOf(fechasDe(getPostsByEstante(estante)))),
  );

  // One page per installable asset, dated by the version it describes.
  const activoRoutes = ACTIVOS.map((item) => entry(item.href, dia(item.activo.publicado)));

  // Sent editions only — an approved-but-unsent issue has no public URL yet,
  // so listing it here would advertise a page the gate in newsletter-archive
  // refuses to render.
  const newsletterRoutes = sentIssues.map((issue) => entry(issue.permalink, dia(issue.date)));

  // One page per month that has a sent weekly edition (src/lib/mensual.ts).
  const mesRoutes = mesesPublicados().map((mes) => entry(rutaDeMes(mes), dia(semanasDelMes(mes)[0].hasta)));

  const glossaryRoutes = Object.entries(glossary).map(([id, term]) => entry(`/glosario/${id}`, term.updated));

  // Indexable posts only. An automated news piece is `noindex, follow` until a
  // person reviews it (`esIndexable`), and — as with the tag routes below — a
  // sitemap that lists pages it asks crawlers not to index contradicts itself.
  // /noticias itself stays: it is the page that explains and lists them.
  const postRoutes = allPosts.filter(esIndexable).map((post) => entry(post.permalink, dia(fechaDe(post))));

  // No tag routes: /blog/tag/<tag> is `noindex, follow`, and a sitemap that
  // lists pages it asks crawlers not to index is contradicting itself.
  return [
    ...staticRoutes,
    ...zonaRoutes,
    ...activoRoutes,
    ...glossaryRoutes,
    ...postRoutes,
    ...newsletterRoutes,
    ...mesRoutes,
  ];
}
