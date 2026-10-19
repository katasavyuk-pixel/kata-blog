import Link from "next/link";
import { Cover } from "@/components/content/cover";
import { PostMeta } from "@/components/content/post-meta";
import { FORMATOS, TEMAS } from "@/config/taxonomy";
import type { Post } from "@/lib/posts";

/**
 * A piece in the archive's stream: what it is first (its format, in red), then
 * the title. Every piece gets the same row, a system included: its ficha lives
 * on /sistemas, and a stream where every third item is a panel of data stops
 * reading as a stream. The cover sits beside the text from a tablet up and is
 * left out on a phone, where it would push the next title off the screen.
 */
export function FlujoRow({ post }: { post: Post }) {
  return (
    <li className="group grid gap-x-8 border-b border-border py-7 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-start">
      <Cover post={post} sizes="208px" className="hidden sm:block" />
      <div className="min-w-0">
        <p className="font-sans text-[0.8125rem]">
          <span className="text-accent-ink">{FORMATOS[post.formato]}</span>{" "}
          <span aria-hidden className="text-faint">
            ·
          </span>{" "}
          <span className="text-faint">{TEMAS[post.tema]}</span>
        </p>
        <h2 className="mt-2 max-w-[38ch] font-display text-[1.5rem] font-semibold leading-tight text-fg">
          <Link href={post.permalink} className="group-hover:text-accent-ink">
            {post.title}
          </Link>
        </h2>
        <p className="mt-2 max-w-[66ch] text-[0.9375rem] leading-relaxed text-muted">
          {post.dek ?? post.description}
        </p>
        <PostMeta post={post} short className="mt-3" />
      </div>
    </li>
  );
}
