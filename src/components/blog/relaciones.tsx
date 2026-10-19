import Link from "next/link";
import { NotaCard } from "@/components/content/nota-card";
import { Estado } from "@/components/sistema/estado";
import { FIRMA_AUTOMATICA } from "@/config/noticias";
import type { LibraryItem } from "@/config/library";
import { formatDateShort } from "@/lib/format";
import { resolveLibraryItem } from "@/lib/library";
import { esAutomatico, type Post } from "@/lib/posts";

/**
 * The three blocks that show how an article connects to the rest of the site.
 * The data comes from `relacionesDe` (src/lib/relaciones.ts); each block renders
 * nothing when its list is empty, so a post with no relations looks exactly as
 * it did before these existed.
 */

const linkClass =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

/**
 * What prompted this piece. It sat right under the header until the
 * 2026-10-14 redesign: now the short answer says what the text answers, and
 * this goes after the body with the other relations, where it no longer
 * pushes the first paragraph down. An automated source is named as such —
 * the piece above is signed, the one it cites is not.
 */
export function ARaizDe({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="a-raiz-de" className="not-prose mt-14 border-t border-border pt-8 font-sans text-[0.9375rem]">
      <h2 id="a-raiz-de" className="font-sans text-[0.9375rem] font-bold tracking-normal text-muted">
        A raíz de
      </h2>
      <ul className="mt-2 space-y-1">
        {posts.map((post) => (
          <li key={post.slug} className="leading-snug">
            <Link href={post.permalink} className={linkClass}>
              {post.title}
            </Link>
            <span className="text-muted">
              {" "}
              · {formatDateShort(post.date)}
              {esAutomatico(post) ? ` · ${FIRMA_AUTOMATICA}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The catalogue items that deal with what the piece talks about, after the body. */
export function SeResuelveCon({ items }: { items: LibraryItem[] }) {
  // `resolveLibraryItem` throws on an item whose post is missing; one with no
  // title of its own and no post resolves to null and has nothing to link.
  const resueltos = items.flatMap((item) => {
    const resuelto = resolveLibraryItem(item);
    return resuelto?.href ? [resuelto] : [];
  });
  if (resueltos.length === 0) return null;
  return (
    <section aria-labelledby="se-resuelve-con" className="not-prose mt-14 border-t border-border pt-8 font-sans">
      <h2 id="se-resuelve-con" className="font-display text-h2">
        Lo que uso para esto
      </h2>
      <ul className="mt-5 space-y-5">
        {resueltos.map((item) => (
          <li key={item.id}>
            <p className="font-sans text-[0.8125rem] text-muted">{item.format}</p>
            <p className="mt-1 text-[1.0625rem] font-semibold text-fg">
              <Link href={item.href!} className="hover:text-accent-ink">
                {item.title}
              </Link>
            </p>
            <p className="mt-1 max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted">{item.queHace}</p>
            <Estado evidencia={item.evidencia} className="mt-2 text-[0.875rem]" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The inverse of `ARaizDe`, on the cited piece: what was written because of it.
 * On a news edition this is the one signed link on the page.
 */
export function DioLugarA({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="dio-lugar-a" className="not-prose mt-14 border-t border-border pt-8">
      <h2 id="dio-lugar-a" className="text-h2">
        Lo que escribí a raíz de esto
      </h2>
      <div className="mt-6 space-y-6">
        {posts.map((post) => (
          <NotaCard key={post.slug} post={post} cover={false} />
        ))}
      </div>
    </section>
  );
}
