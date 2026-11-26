import type { NextConfig } from "next";
import { BASE_PATH } from "./src/config/base-path";
import { POSTS_RETIRADOS, redireccionesDeHostsAntiguos } from "./src/config/migracion";

const nextConfig: NextConfig = {
  // 26-nov-2026: the blog is a zone of ianexora.com, under /blog. NBI-WEB
  // rewrites ianexora.com/blog/* to this project; see src/config/base-path.ts
  // and docs/migracion-ianexora-blog.md.
  basePath: BASE_PATH,
  // The deploy's date, fixed when the build starts and the same in the server and
  // client bundles: the footer's «Versión del …» (src/lib/version.ts).
  env: { FECHA_DE_VERSION: new Date().toISOString() },
  images: {
    // Whitelist only your own / EU-hosted image origins when needed (Fase 1).
    // Example: { protocol: "https", hostname: "images.tudominio.com" }
    // i.ytimg.com: YouTube video thumbnails for the "Construir de cero" strip.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
  // <ViewTransition> works in the App Router with no configuration since Next 16.3;
  // experimental.viewTransition no longer exists.
  async redirects() {
    return [
      // The old hosts (kata.ianexora.com, blog.ianexora.com): one 301 to the
      // same content on ianexora.com/blog, path and query kept. They run
      // outside the base path (`basePath: false`). src/config/migracion.ts.
      ...redireccionesDeHostsAntiguos(),
      // The old permalinks, reached through this zone: /blog/blog/<slug> was
      // never public, but a link written for the old site ("/blog/<slug>")
      // and passed through <Link> lands there. Same for the old archive.
      // The three personal posts that left on 26-nov-2026 (src/config/migracion.ts).
      ...POSTS_RETIRADOS.map((r) => ({ ...r, statusCode: 301 as const })),
      ...POSTS_RETIRADOS.map((r) => ({ ...r, source: `/blog${r.source}`, statusCode: 301 as const })),
      { source: "/blog", destination: "/lecturas", statusCode: 301 },
      { source: "/blog/:path+", destination: "/:path+", statusCode: 301 },
      // The author page is ianexora.com's, the one entity for both sites.
      {
        source: "/sobre-mi",
        destination: "https://ianexora.com/sobre-katalin-savyuk",
        statusCode: 301,
      },
      // Keep the singular bio URL working alongside the canonical page.
      {
        source: "/enlace",
        destination: "/enlaces",
        permanent: true,
      },
      // Short link for YouTube descriptions / pinned comments.
      {
        source: "/yt",
        destination: "/herramientas?utm_source=youtube",
        permanent: false,
      },
      // Redesign "El Universo": the library route became /sistemas.
      {
        source: "/biblioteca",
        destination: "/sistemas",
        permanent: true,
      },
      // The series was "Radar IA"; it is now "Noticias" and publishes daily in
      // automatic. Editions keep their /blog/<slug> permalinks, so nothing
      // indexed moves.
      {
        source: "/tag/radar",
        destination: "/noticias",
        permanent: true,
      },
      // The series name and route changed with the move to daily automatic
      // publication; the permanent redirect (308) keeps old external links and the index signal.
      {
        source: "/radar",
        destination: "/noticias",
        permanent: true,
      },
      // The archive no longer carries the news, so the old "Radar" filter has
      // one honest destination. The query string is passed through by Next
      // (/noticias?seccion=radar); the page ignores it and its canonical is
      // /noticias. `?seccion=ideas|practica` are not redirected: /blog renders
      // the full archive for them.
      {
        source: "/lecturas",
        has: [{ type: "query", key: "seccion", value: "radar" }],
        destination: "/noticias",
        permanent: true,
      },
      // 2026-10-14: the home's four doors. «Recursos» is «Herramientas» now,
      // and the skill sheets moved under the marketplace. /sistemas itself
      // stays: it is the shelf of systems I run, reached from «Lecturas».
      {
        source: "/recursos",
        destination: "/herramientas",
        permanent: true,
      },
      {
        source: "/sistemas/:id",
        destination: "/marketplace/:id",
        permanent: true,
      },
      // /diagnostico now lives on ianexora.com; the test watches this redirect.
      {
        source: "/diagnostico",
        destination:
          "https://ianexora.com/servicios/diagnostico-de-procesos?utm_source=blog&utm_medium=redirect&utm_campaign=diagnostico-legacy",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
