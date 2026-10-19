import { posts, type Post } from "#site/content";
import {
  ESTANTE_POR_FORMATO,
  FORMATO_AUTOMATICO,
  RUTA_POR_ESTANTE,
  type Estante,
} from "@/config/taxonomy";

export type { Post };

/**
 * Public posts: not draft, not premium (premium is gated to members in Fase 3),
 * sorted by date descending. This is the single source for every public surface
 * (listing, post page, sitemap, RSS) so gating is enforced server-side everywhere.
 */
export const allPosts: Post[] = [...posts]
  .filter((post) => !post.draft && !post.premium)
  .sort((a, b) => +new Date(b.date) - +new Date(a.date));

export function getPost(slug: string): Post | undefined {
  return allPosts.find((post) => post.slug === slug);
}

export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of allPosts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function getPostsByTag(tag: string): Post[] {
  return allPosts.filter((post) => post.tags.includes(tag));
}

/** The shelf a post lives on. Derived from `formato`; see config/taxonomy. */
export function estanteDe(post: Pick<Post, "formato">): Estante {
  return ESTANTE_POR_FORMATO[post.formato];
}

/**
 * Written by the news system, not by a person: the daily edition and its lead
 * article. `formato` is the only test, as everywhere else.
 */
export function esAutomatico(post: Pick<Post, "formato">): boolean {
  return post.formato === FORMATO_AUTOMATICO;
}

/**
 * Whether a post belongs in the search index and the sitemap.
 *
 * Everything written by hand does. An automated piece does not until a person
 * has reviewed it (`revisado`): it is a reading service for whoever is already
 * here, and several hundred unreviewed machine-written pages a year next to a
 * few dozen hand-written ones is what Google's scaled-content policy describes.
 * The page stays reachable and `follow`ed — only `index` changes.
 */
export function esIndexable(post: Pick<Post, "formato" | "revisado">): boolean {
  return !esAutomatico(post) || post.revisado;
}

/**
 * The automated daily editions, newest first. `formato` is the only test: the
 * `radar` tag is free text an edition can lose, and `seccion` is legacy.
 */
export function getNoticias(): Post[] {
  return allPosts.filter((post) => post.formato === "radar");
}

/**
 * The brief daily roundups only (`noticias-AAAA-MM-DD`), newest first. The home
 * strip and the cadence label count these; lead articles are not editions.
 */
export function getEdiciones(): Post[] {
  return getNoticias().filter((post) => !post.protagonista);
}

/** Lead articles (`noticia-AAAA-MM-DD`), newest first. Same shelf, same feed. */
export function getArticulosNoticia(): Post[] {
  return getNoticias().filter((post) => post.protagonista);
}

/** Everything written by hand: the archive, the main feed, the home. */
export function getEditoriales(): Post[] {
  return allPosts.filter((post) => post.formato !== "radar");
}

export function getPostsByEstante(estante: Estante): Post[] {
  return allPosts.filter((post) => estanteDe(post) === estante);
}

/**
 * The shelves whose page only exists once something is on them (/guias,
 * /reflexiones answer 404 while empty). Everything that links to a shelf's
 * page or lists it — the sitemap, /llms.txt, the archive — asks here first.
 */
const ZONAS_CONDICIONALES: readonly Estante[] = ["guias", "reflexiones"];

export function zonasConContenido(): Estante[] {
  return ZONAS_CONDICIONALES.filter((estante) => getPostsByEstante(estante).length > 0);
}

/** Whether a shelf's own page can be linked: it has one, and it is not a 404. */
export function tienePaginaViva(estante: Estante): boolean {
  if (RUTA_POR_ESTANTE[estante] === "/blog") return false;
  return !ZONAS_CONDICIONALES.includes(estante) || getPostsByEstante(estante).length > 0;
}

/**
 * Posts to keep reading after `post`: ranked by shared tags (news editions
 * excluded — they're news, not evergreen), newest first on ties, padded with
 * recent posts when tag overlap runs out.
 */
export function getRelatedPosts(post: Post, limit = 3): Post[] {
  const candidates = getEditoriales().filter((p) => p.slug !== post.slug);
  const scored = candidates
    .map((p) => ({
      post: p,
      score: p.tags.filter((tag) => post.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.post);
}
