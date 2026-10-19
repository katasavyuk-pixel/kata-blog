import type { Metadata } from "next";
import { PuenteNbi } from "@/components/blog/puente-nbi";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { glossary } from "@/lib/glossary";
import { getPost } from "@/lib/posts";
import { JsonLd } from "@/components/ui/json-ld";
import { breadcrumbJsonLd, definedTermJsonLd } from "@/lib/jsonld";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";

export function generateStaticParams() {
  return Object.keys(glossary).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = glossary[id];
  if (!entry) return {};
  return withOpenGraph(`/glosario/${id}`, {
    // The search pattern of the brief of 17-oct-2026, without «(con ejemplos)»:
    // an entry is one sentence today, and the title would promise what is not there.
    title: { absolute: `Qué es ${entry.enFrase} en IA · Glosario ${siteConfig.name}` },
    description: entry.def,
    alternates: { ...feedAlternates, canonical: `/glosario/${id}` },
  });
}

export default async function GlossaryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = glossary[id];
  if (!entry) notFound();

  const relatedPost = entry.relatedSlug ? getPost(entry.relatedSlug) : undefined;

  return (
    <Container className="py-10 sm:py-14">
      {/* DefinedTerm, not FAQPage: this page really is a named concept with a
          definition inside a set, and that data already exists in glossary.ts. */}
      <JsonLd
        data={[
          definedTermJsonLd({ id, title: entry.title, def: entry.def }),
          breadcrumbJsonLd([
            { name: "Glosario", path: "/glosario" },
            { name: entry.title, path: `/glosario/${id}` },
          ]),
        ]}
      />
      <div className="mx-auto max-w-[66ch]">
        <p className="font-sans text-[0.8125rem] font-semibold text-fg">
          <Link href="/glosario" className="hover:text-accent-ink">
            Glosario
          </Link>
        </p>
        <h1 className="mt-3 text-h1">{entry.title}</h1>
        <p className="mt-5 text-muted">{entry.def}</p>

        {relatedPost ? (
          <section
            aria-labelledby="glosario-articulo"
            className="mt-12 border-t border-border pt-6 font-sans"
          >
            <p className="text-[0.9375rem] text-muted">
              Este término se explica a fondo, con ejemplos interactivos, en:
            </p>
            <h2 id="glosario-articulo" className="mt-2 text-h3">
              {relatedPost.title}
            </h2>
            <div className="mt-4">
              <Button href={relatedPost.permalink} size="sm">
                Leer el artículo completo
                <Icon name="chevron-right" />
              </Button>
            </div>
          </section>
        ) : null}
        <PuenteNbi guia="agente" campana="glosario" />
      </div>
    </Container>
  );
}
