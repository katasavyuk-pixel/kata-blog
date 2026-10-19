import Link from "next/link";
import { PostMeta } from "@/components/content/post-meta";
import { FORMATOS, TEMAS } from "@/config/taxonomy";
import type { Post } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Cover } from "@/components/content/cover";

/**
 * A system that has an article but no ficha in config/library. Same shape as
 * the ficha — mono header, three data rows — so the two sit in one grid
 * without one reading as "the real card". The rows only say what the post
 * itself says: what it is about, what it does (the dek), when it was
 * published. No status, because nothing in config backs one.
 */
export function SistemaCard({ post, className }: { post: Post; className?: string }) {
  return (
    <article className={cn("group font-sans", className)}>
      <Cover post={post} sizes="(min-width: 1024px) 560px, 100vw" className="mb-4" />
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-sans text-[0.8125rem] text-muted">
        <span>
          <Icon name="play" className="mr-2 text-[0.75em] text-accent-ink" />
          {FORMATOS[post.formato]}
        </span>
        <span className="text-faint">{TEMAS[post.tema]}</span>
      </header>
      <h3 className="mt-3 font-display text-[1.5rem] font-semibold leading-tight text-fg">
        <Link href={post.permalink} className="group-hover:text-accent-ink">
          {post.title}
        </Link>
      </h3>
      <dl className="mt-4 grid gap-y-3 text-[0.9375rem] leading-relaxed">
        <Row label="Qué hace">
          <p className="text-fg">{post.dek ?? post.description}</p>
        </Row>
        <Row label="Lectura">
          <p className="text-muted">{Math.max(1, Math.round(post.metadata.readingTime))} min</p>
        </Row>
        <Row label="Publicado">
          <PostMeta post={post} short className="font-sans text-[0.9375rem] text-muted" />
        </Row>
      </dl>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-1 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <dt className="font-sans text-[0.8125rem] text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
