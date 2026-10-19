import Link from "next/link";
import { PostMeta } from "@/components/content/post-meta";
import { FORMATOS, TEMAS } from "@/config/taxonomy";
import type { Post } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { Cover } from "@/components/content/cover";

/**
 * A piece of writing that is not a system: its documentary cover, kicker
 * (formato · tema), title, dek, date. No box around it — the cover and the
 * type carry it. `cover={false}` for dense lists (related reading).
 */
export function NotaCard({
  post,
  heading = "h3",
  className,
  cover = true,
}: {
  post: Post;
  cover?: boolean;
  heading?: "h2" | "h3";
  className?: string;
}) {
  const Heading = heading;
  return (
    <article className={cn("group", !cover && "border-t border-border pt-4", className)}>
      {cover ? (
        <Cover post={post} sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="mb-4" />
      ) : null}
      <p className="font-sans text-[0.8125rem] text-muted">
        {FORMATOS[post.formato]} <span aria-hidden>·</span> {TEMAS[post.tema]}
      </p>
      <Heading className="mt-2 font-display text-[1.375rem] font-semibold leading-tight text-fg">
        <Link href={post.permalink} className="group-hover:text-accent-ink">
          {post.title}
        </Link>
      </Heading>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
        {post.dek ?? post.description}
      </p>
      <PostMeta post={post} short className="mt-3" />
    </article>
  );
}
