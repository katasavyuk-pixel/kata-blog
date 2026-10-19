import { LIBRARY_ITEMS, type LibraryItem } from "@/config/library";
import { allPosts, esAutomatico, type Post } from "@/lib/posts";

/**
 * How the pieces of the site point at each other.
 *
 * A hand-written post declares, in its frontmatter, what prompted it
 * (`a_raiz_de`: other posts, usually a news edition) and what deals with it
 * (`se_resuelve_con`: catalogue items). That is the only place a relation is
 * written. The other direction — "what was written because of this news",
 * "where this system appears" — is derived here, so the two sides of a link
 * cannot disagree and nobody has to remember to update the second one.
 *
 * `buildGrafo` is pure and throws on anything that does not hold up: a slug or
 * an id that does not exist, a piece citing itself, the same reference twice,
 * or an automated piece declaring relations (an editorial judgement the news
 * system does not get to make). `grafo` is built at module load from the
 * published posts, so a broken relation fails `next build`, the same way a
 * library item pointing at a draft does.
 */

type Nodo = Pick<Post, "slug" | "formato" | "a_raiz_de" | "se_resuelve_con">;

export type Grafo<P extends Nodo, I extends { id: string }> = {
  /** Post slug → the posts that prompted it, in the order declared. */
  aRaizDe: Map<string, P[]>;
  /** Post slug → the catalogue items that deal with it, in the order declared. */
  seResuelveCon: Map<string, I[]>;
  /** Inverse of `aRaizDe`: cited slug → what was written because of it. */
  dioLugarA: Map<string, P[]>;
  /** Inverse of `seResuelveCon`: item id → the posts that name it. */
  apareceEn: Map<string, P[]>;
};

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function buildGrafo<P extends Nodo, I extends { id: string }>(
  posts: readonly P[],
  items: readonly I[],
): Grafo<P, I> {
  const porSlug = new Map(posts.map((post) => [post.slug, post]));
  const porId = new Map(items.map((item) => [item.id, item]));
  const grafo: Grafo<P, I> = {
    aRaizDe: new Map(),
    seResuelveCon: new Map(),
    dioLugarA: new Map(),
    apareceEn: new Map(),
  };
  const errores: string[] = [];

  for (const post of posts) {
    const declara = post.a_raiz_de.length > 0 || post.se_resuelve_con.length > 0;
    if (!declara) continue;
    if (esAutomatico(post)) {
      errores.push(`${post.slug} es una pieza automática y declara relaciones: solo las declara lo escrito a mano.`);
      continue;
    }

    for (const [campo, refs] of [
      ["a_raiz_de", post.a_raiz_de],
      ["se_resuelve_con", post.se_resuelve_con],
    ] as const) {
      if (new Set(refs).size !== refs.length) errores.push(`${post.slug}: ${campo} repite una referencia.`);
    }

    for (const slug of new Set(post.a_raiz_de)) {
      const citado = porSlug.get(slug);
      if (slug === post.slug) errores.push(`${post.slug}: a_raiz_de se cita a sí mismo.`);
      else if (!citado) errores.push(`${post.slug}: a_raiz_de apunta a «${slug}», que no existe o no está publicado.`);
      else {
        push(grafo.aRaizDe, post.slug, citado);
        push(grafo.dioLugarA, slug, post);
      }
    }

    for (const id of new Set(post.se_resuelve_con)) {
      const item = porId.get(id);
      if (!item) errores.push(`${post.slug}: se_resuelve_con apunta a «${id}», que no está en config/library.ts.`);
      else {
        push(grafo.seResuelveCon, post.slug, item);
        push(grafo.apareceEn, id, post);
      }
    }
  }

  if (errores.length > 0) {
    throw new Error(`Relaciones rotas en el frontmatter:\n- ${errores.join("\n- ")}`);
  }
  return grafo;
}

export const grafo: Grafo<Post, LibraryItem> = buildGrafo(allPosts, LIBRARY_ITEMS);

/** Everything a post's page shows about its connections. Empty lists when it has none. */
export function relacionesDe(post: Pick<Post, "slug">): {
  aRaizDe: Post[];
  seResuelveCon: LibraryItem[];
  dioLugarA: Post[];
} {
  return {
    aRaizDe: grafo.aRaizDe.get(post.slug) ?? [],
    seResuelveCon: grafo.seResuelveCon.get(post.slug) ?? [],
    dioLugarA: grafo.dioLugarA.get(post.slug) ?? [],
  };
}

/** The posts that name a catalogue item. */
export function apareceEn(itemId: string): Post[] {
  return grafo.apareceEn.get(itemId) ?? [];
}
