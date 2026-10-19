import Link from "next/link";
import { formatDateShort } from "@/lib/format";
import type { Post } from "@/lib/posts";
import { cn } from "@/lib/utils";

/**
 * One news edition as one dense line: date, title, nothing else. Never an
 * image — a system publishes these, and they should not compete with what is
 * written by hand.
 */
export function NoticiaRow({ post }: { post: Post }) {
  return (
    <li>
      <Link
        href={post.permalink}
        className="group grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-border py-3 font-sans transition-colors hover:border-accent"
      >
        <time dateTime={post.date} className="font-sans text-[0.8125rem] text-muted">
          {formatDateShort(post.date)}
        </time>
        <span className="text-[0.9375rem] leading-snug text-fg group-hover:text-accent-ink">
          {post.title}
        </span>
      </Link>
    </li>
  );
}

/** The list of editions — a plain `ul`, deliberately not a grid. */
export function NoticiaList({ posts, className }: { posts: Post[]; className?: string }) {
  if (posts.length === 0) return null;
  return (
    <ul className={cn("border-t border-border", className)}>
      {posts.map((post) => (
        <NoticiaRow key={post.slug} post={post} />
      ))}
    </ul>
  );
}
