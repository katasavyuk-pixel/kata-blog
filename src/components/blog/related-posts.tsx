import { NotaCard } from "@/components/content/nota-card";
import type { Post } from "@/lib/posts";

/** "Sigue leyendo" — related articles at the end of a post, so the reading flow never dead-ends. */
export function RelatedPosts({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <aside aria-labelledby="related-heading" className="mt-14 font-sans">
      <h2 id="related-heading" className="font-sans text-[0.8125rem] font-semibold text-muted">
        Sigue leyendo
      </h2>
      <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-3">
        {posts.map((post) => <NotaCard key={post.slug} post={post} />)}
      </div>
    </aside>
  );
}
