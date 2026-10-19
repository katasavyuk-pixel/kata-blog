import { Feed } from "feed";
import { feeds, siteConfig } from "@/config/site";
import { PROYECTOS } from "@/config/bitacora";
import { entradasBitacora } from "@/lib/bitacora";
import { conDcCreator } from "@/lib/feed";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * The build log as a feed: one item per entry. The item links to the entry's
 * anchor on /bitacora, and the entry's own link (its proof) is in the body,
 * so a reader lands on the log first and the proof is one click away.
 */
export function GET() {
  const base = siteConfig.url;
  const feed = new Feed({
    title: feeds.bitacora.title,
    description: "Lo que construyo, fecha a fecha: lanzamientos, mejoras y arreglos, cada uno con su prueba.",
    id: `${base}/bitacora`,
    link: `${base}/bitacora`,
    language: siteConfig.locale,
    copyright: `© ${new Date().getFullYear()} ${siteConfig.author.name}`,
    feedLinks: { rss2: `${base}${feeds.bitacora.href}` },
    author: { name: siteConfig.author.name, link: base },
  });

  for (const entrada of entradasBitacora) {
    const url = `${base}${entrada.permalink}`;
    const prueba = entrada.enlace.startsWith("http") ? entrada.enlace : `${base}${entrada.enlace}`;
    feed.addItem({
      title: entrada.titulo,
      id: url,
      link: url,
      description: entrada.html.replace(/<[^>]+>/g, "").trim(),
      content: `${entrada.html}<p><a href="${prueba}">Verlo</a></p>`,
      date: new Date(entrada.fecha),
      author: [{ name: siteConfig.author.name }],
      category: [{ name: PROYECTOS[entrada.proyecto] }],
    });
  }

  return new Response(conDcCreator(feed.rss2(), entradasBitacora.map(() => siteConfig.author.name)), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
