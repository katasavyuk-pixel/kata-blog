import { Feed } from "feed";
import { esAutomatico, type Post } from "@/lib/posts";
import { siteConfig } from "@/config/site";
import { FIRMA_AUTOMATICA } from "@/config/noticias";

/**
 * Adds `<dc:creator>` to every item, in the order the items were added.
 *
 * `feed` writes an item's author only as `<author>`, which RSS defines as an
 * email address, so with a name and no address it wrote nothing: the audit of
 * 17-oct-2026 found the 21 items of /feed.xml without an author. `dc:creator`
 * takes a name, and no address is published.
 */
export function conDcCreator(xml: string, nombres: readonly string[]): string {
  let i = 0;
  const conAutor = xml.replace(/<\/item>/g, (cierre) => {
    const nombre = nombres[i++];
    if (!nombre) return cierre;
    return `<dc:creator><![CDATA[${nombre.replaceAll("]]>", "]]]]><![CDATA[>")}]]></dc:creator>\n        ${cierre}`;
  });
  return conAutor.includes("xmlns:dc=")
    ? conAutor
    : conAutor.replace("<rss ", '<rss xmlns:dc="http://purl.org/dc/elements/1.1/" ');
}

const escapar = (texto: string) =>
  texto.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const absoluta = (ruta: string) => (/^https?:\/\//.test(ruta) ? ruta : `${siteConfig.url}${ruta}`);

/**
 * What a reader (Feedly, Inoreader, Flipboard) shows of a piece: its cover,
 * the short answer and what you take away, then the way to the page. Until
 * 17-oct-2026 it was the Velite excerpt, ~260 characters cut mid-word. A
 * piece without `respuesta` keeps the excerpt.
 */
export function contenidoDelItem(
  post: Pick<Post, "title" | "excerpt" | "respuesta" | "te_llevas" | "cover" | "coverAlt">,
  url: string,
): string {
  const partes: string[] = [];
  if (post.cover) {
    partes.push(`<p><img src="${escapar(absoluta(post.cover.src))}" alt="${escapar(post.coverAlt ?? post.title)}" width="${post.cover.width}" height="${post.cover.height}" /></p>`);
  }
  partes.push(`<p>${escapar(post.respuesta ?? post.excerpt)}</p>`);
  const llevas = post.te_llevas ?? [];
  if (llevas.length > 0) {
    partes.push(`<ul>${llevas.map((linea) => `<li>${escapar(linea)}</li>`).join("")}</ul>`);
  }
  partes.push(`<p><a href="${escapar(url)}">Sigue leyendo en ${escapar(siteConfig.name)}</a></p>`);
  return partes.join("\n");
}

/**
 * One generator for both feeds (/feed.xml and /noticias/feed.xml), so they
 * cannot drift into two item shapes. The caller decides which posts go in;
 * `allPosts` is already draft/premium-filtered, so nothing gated can leak.
 */
export function rssResponse({
  posts,
  title,
  description,
  feedPath,
  sitePath = "",
}: {
  posts: Post[];
  title: string;
  description: string;
  /** Where this feed is served, e.g. "/feed.xml". */
  feedPath: string;
  /** The page the feed belongs to, e.g. "/noticias". Defaults to the home. */
  sitePath?: string;
}): Response {
  const base = siteConfig.url;
  const feed = new Feed({
    title,
    description,
    id: `${base}${sitePath}`,
    link: `${base}${sitePath}`,
    language: siteConfig.locale,
    copyright: `© ${new Date().getFullYear()} ${siteConfig.author.name}`,
    // `feed` writes `<atom:link rel="self">` from this option only, not from feedLinks.
    feed: `${base}${feedPath}`,
    feedLinks: { rss2: `${base}${feedPath}` },
    author: { name: siteConfig.author.name, link: base },
  });

  const autores: string[] = [];
  for (const post of posts) {
    const url = `${base}${post.permalink}`;
    autores.push(esAutomatico(post) ? FIRMA_AUTOMATICA : siteConfig.author.name);
    feed.addItem({
      title: post.title,
      id: url,
      link: url,
      description: post.description,
      content: contenidoDelItem(post, url),
      // The cover as the item's enclosure: what readers show as its picture.
      image: post.cover ? { url: absoluta(post.cover.src), type: `image/${post.cover.src.split(".").pop()}` } : undefined,
      date: new Date(post.date),
      // An automated piece is signed by the system, here as on its page.
      author: [{ name: esAutomatico(post) ? FIRMA_AUTOMATICA : siteConfig.author.name }],
      category: post.tags.map((name) => ({ name })),
    });
  }

  return new Response(conDcCreator(feed.rss2(), autores), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
