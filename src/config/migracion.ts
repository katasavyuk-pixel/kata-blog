/**
 * The 301s from the old hosts to ianexora.com/blog (migration of 26-nov-2026).
 *
 * kata.ianexora.com (and blog.ianexora.com, which already pointed at it) stay
 * attached to this Vercel project only to answer with these redirects: one
 * hop, same path, query string intact (Next passes it through), so the signed
 * `/api/download?slug&e&exp&sig` links already sitting in inboxes keep
 * verifying: the HMAC covers `slug|email|exp`, not the host or the path
 * (src/lib/signed-links.ts), and DOWNLOAD_LINK_SECRET is not rotated.
 *
 * The rules only match the old Host header, so the zone itself (reached by
 * NBI-WEB's rewrite through the project's vercel.app domain) never redirects.
 *
 * Kept as data so tests/migracion.test.ts can check every old URL lands in one
 * hop without spinning up a server.
 */
// No imports: next.config.ts loads this file directly.
const NBI_ORIGIN = "https://ianexora.com";

export const HOSTS_ANTIGUOS = ["kata.ianexora.com", "blog.ianexora.com", "www.blog.ianexora.com"] as const;

export const DESTINO = `${NBI_ORIGIN}/blog`;

type Regla = {
  source: string;
  destination: string;
  has?: { type: "query"; key: string; value?: string }[];
};

/**
 * The three personal posts that leave the NBI blog (26-nov-2026, Kata's §10):
 * they live on in the design/blog-personal-v1 tag. A 301 to the closest page
 * rather than a 410: they have links and the reader still gets an answer.
 * Kata (26-nov-2026, 9:07): all three go to NBI's author page.
 */
export const POSTS_RETIRADOS: readonly Regla[] = [
  { source: "/por-que-hago-esto", destination: `${NBI_ORIGIN}/sobre-katalin-savyuk` },
  { source: "/lo-que-me-cuesta-avanzar", destination: `${NBI_ORIGIN}/sobre-katalin-savyuk` },
  { source: "/bienvenida", destination: `${NBI_ORIGIN}/sobre-katalin-savyuk` },
];

/**
 * Old path → new absolute URL, most specific first (Next takes the first
 * match). The legacy redirects of next.config.ts are resolved to their final
 * destination here so an old short link is still one hop.
 */
export const REGLAS_HOST_ANTIGUO: readonly Regla[] = [
  { source: "/", destination: DESTINO },
  // Old archive filter «Radar» and the old tag → the news.
  { source: "/blog", has: [{ type: "query", key: "seccion", value: "radar" }], destination: `${DESTINO}/noticias` },
  { source: "/blog", destination: `${DESTINO}/lecturas` },
  { source: "/blog/tag/radar", destination: `${DESTINO}/noticias` },
  ...POSTS_RETIRADOS.map((r) => ({ source: `/blog${r.source}`, destination: r.destination })),
  // The article permalink drops its /blog segment: /blog/<x> → /blog/<x>.
  { source: "/blog/:path+", destination: `${DESTINO}/:path+` },
  { source: "/sobre-mi", destination: `${NBI_ORIGIN}/sobre-katalin-savyuk` },
  { source: "/enlace", destination: `${DESTINO}/enlaces` },
  { source: "/biblioteca", destination: `${DESTINO}/sistemas` },
  { source: "/radar", destination: `${DESTINO}/noticias` },
  { source: "/yt", destination: `${DESTINO}/herramientas?utm_source=youtube` },
  { source: "/recursos", destination: `${DESTINO}/herramientas` },
  { source: "/sistemas/:id", destination: `${DESTINO}/marketplace/:id` },
  {
    source: "/diagnostico",
    destination: `${NBI_ORIGIN}/servicios/diagnostico-de-procesos?utm_source=blog&utm_medium=redirect&utm_campaign=diagnostico-legacy`,
  },
  // Everything else: same path under /blog (api/download included).
  { source: "/:path+", destination: `${DESTINO}/:path+` },
];

/** The rules as Next redirects: one set per old host, outside the base path, 301. */
export function redireccionesDeHostsAntiguos() {
  return HOSTS_ANTIGUOS.flatMap((host) =>
    REGLAS_HOST_ANTIGUO.map((regla) => ({
      ...regla,
      basePath: false as const,
      has: [{ type: "host" as const, value: host }, ...(regla.has ?? [])],
      statusCode: 301 as const,
    })),
  );
}
