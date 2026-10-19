import { formatDate, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/posts";

/**
 * Publication date metadata shared by cards, archive rows and article pages.
 *
 * It used to be hand-copied in five files with three different colours and two
 * different suffixes ("min" vs "min de lectura"), which is why the same piece of
 * metadata looked like a different component on every surface.
 *
 * Also renders `updated`, which no surface showed at all: the field was fed to
 * OpenGraph, JSON-LD and the sitemap, so machines knew a post had been revised
 * and readers did not. On a site whose argument is "probado", that is the single
 * cheapest authority signal available.
 */
export function PostMeta({
  post,
  short = false,
  className,
}: {
  post: Post;
  /** Compact date for dense rows and small cards. */
  short?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[0.8125rem] text-muted",
        className,
      )}
    >
      {/* Labelled in the long form so a bare date cannot be read as "updated".
          Dense rows stay unlabelled — there the column position says it. */}
      <span>
        {short ? null : "Publicado el "}
        <time dateTime={post.date}>
          {short ? formatDateShort(post.date) : formatDate(post.date)}
        </time>
      </span>
      {post.updated ? (
        <>
          <span aria-hidden>·</span>
          <span className="text-accent-ink">
            actualizado{" "}
            <time dateTime={post.updated}>{formatDateShort(post.updated)}</time>
          </span>
        </>
      ) : null}
    </div>
  );
}
