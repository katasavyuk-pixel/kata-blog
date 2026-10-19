import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { NotaCard } from "@/components/content/nota-card";
import { TagList } from "@/components/blog/tag-list";
import { getAllTags, getPostsByTag } from "@/lib/posts";
import { feedAlternates } from "@/config/site";

export function generateStaticParams() {
  return getAllTags().map(({ tag }) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded}`,
    description: `Artículos etiquetados como ${decoded}.`,
    alternates: { ...feedAlternates, canonical: `/blog/tag/${tag}` },
    // Tags are free-text long-tail keywords, mostly listings of one or two
    // posts. Crawlers may follow them to the articles; the listing itself
    // stays out of the index and out of the sitemap.
    robots: { index: false, follow: true },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts = getPostsByTag(decoded);
  if (posts.length === 0) notFound();

  return (
    <Container size="wide" className="py-10 sm:py-14">
      <header className="max-w-[66ch]">
        <p className="font-sans text-[0.8125rem] font-semibold text-fg">
          Etiqueta · {posts.length} {posts.length === 1 ? "pieza" : "piezas"}
        </p>
        <h1 className="mt-3 text-h1">#{decoded}</h1>
      </header>

      <div className="mt-6">
        <TagList tags={getAllTags()} active={decoded} />
      </div>

      <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <NotaCard key={post.slug} post={post} heading="h2" />
        ))}
      </div>
    </Container>
  );
}
