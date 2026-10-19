import { LIBRARY_ITEMS, type LibraryItem } from "@/config/library";
import { getPost } from "@/lib/posts";

export type ResolvedLibraryItem = LibraryItem & { title: string; blurb: string };

/**
 * Hydrate a config item from its backing post (when slug is set).
 *
 * The ficha, /sistemas and /recursos all need it, so it lives in lib.
 */
export function resolveLibraryItem(item: LibraryItem): ResolvedLibraryItem | null {
  if (item.slug) {
    const post = getPost(item.slug);
    if (!post) {
      // This used to `return null`, which is how stack-geo vanished from both
      // /sistemas and the home: the item claimed to be available while its post
      // was still draft, and the UI rendered nothing rather than saying so.
      throw new Error(
        `LIBRARY_ITEMS["${item.id}"] apunta al slug "${item.slug}", que no existe o es draft/premium. ` +
          'Publica el post, o cambia su evidencia a { tipo: "en-taller", eta: "YYYY-MM" }.',
      );
    }
    return {
      ...item,
      title: item.title ?? post.title,
      blurb: item.blurb ?? post.dek ?? post.description,
      href: item.href ?? post.permalink,
    };
  }
  if (!item.title || !item.blurb) return null;
  return item as ResolvedLibraryItem;
}

/**
 * The system behind an article, if config/library declares one for that
 * slug. `slug` is the only mapping: frontmatter does not know about fichas,
 * and the item already names the post it hydrates from.
 */
export function fichaForPost(slug: string): ResolvedLibraryItem | null {
  const item = LIBRARY_ITEMS.find((candidate) => candidate.slug === slug);
  return item ? resolveLibraryItem(item) : null;
}
