import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd } from "@/lib/jsonld";
import { Container } from "@/components/ui/container";
import { NotaCard } from "@/components/content/nota-card";
import { feedAlternates, withOpenGraph } from "@/config/site";
import { RUTA_SECTORES, SECTORES, esSector, rutaDeSector } from "@/config/sectores";
import { getPostsBySector, sectoresConContenido } from "@/lib/posts";

export function generateStaticParams() {
  return sectoresConContenido().map((sector) => ({ sector }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string }>;
}): Promise<Metadata> {
  const { sector } = await params;
  if (!esSector(sector)) return {};
  const posts = getPostsBySector(sector);
  if (posts.length === 0) return {};
  const meta = SECTORES[sector];
  return withOpenGraph(rutaDeSector(sector), {
    title: `IA para ${meta.label.toLowerCase()}`,
    description: meta.description,
    alternates: { ...feedAlternates, canonical: rutaDeSector(sector) },
  });
}

export default async function SectorPage({
  params,
}: {
  params: Promise<{ sector: string }>;
}) {
  const { sector } = await params;
  if (!esSector(sector)) notFound();
  const posts = getPostsBySector(sector);
  if (posts.length === 0) notFound();
  const meta = SECTORES[sector];
  const path = rutaDeSector(sector);

  return (
    <Container size="wide" className="py-10 sm:py-14">
      <JsonLd
        data={coleccionJsonLd({
          path,
          name: meta.label,
          description: meta.description,
          items: posts.map((p) => ({ name: p.title, url: p.permalink })),
        })}
      />
      <header className="max-w-[66ch]">
        <p className="font-sans text-[0.8125rem] font-semibold text-fg">
          <Link
            href={RUTA_SECTORES}
            className="text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
          >
            Por sector
          </Link>
          {" · "}
          {posts.length} {posts.length === 1 ? "artículo" : "artículos"}
        </p>
        <h1 className="mt-3 text-h1">{meta.label}</h1>
        <p className="mt-4 text-muted">{meta.description}</p>
      </header>
      <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <NotaCard key={post.slug} post={post} heading="h2" />
        ))}
      </div>
    </Container>
  );
}
