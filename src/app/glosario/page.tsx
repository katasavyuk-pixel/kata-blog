import type { Metadata } from "next";
import { PuenteNbi } from "@/components/blog/puente-nbi";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd, datosDe } from "@/lib/jsonld";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { glossary } from "@/lib/glossary";
import { feedAlternates, withOpenGraph } from "@/config/site";

export const metadata: Metadata = withOpenGraph("/glosario", {
  title: "Glosario",
  description:
    "Glosario de IA en español: qué es un token, un embedding, RAG, un prompt, una alucinación o la ventana de contexto, explicado en una frase cada uno.",
  alternates: { ...feedAlternates, canonical: "/glosario" },
});

export default function GlossaryPage() {
  const entries = Object.entries(glossary).sort((a, b) =>
    a[1].title.localeCompare(b[1].title, "es"),
  );

  return (
    <Container className="py-10 sm:py-14">
      <JsonLd
        data={coleccionJsonLd({
          path: "/glosario",
          ...datosDe(metadata),
          items: entries.map(([id, entry]) => ({ name: entry.title, url: `/glosario/${id}` })),
        })}
      />
      <header className="max-w-[66ch]">
        <p className="font-sans text-[0.8125rem] font-semibold text-fg">
          Glosario · {entries.length} términos
        </p>
        <h1 className="mt-3 text-h1">Términos de IA, sin rodeos</h1>
        <p className="mt-4 text-muted">
          Los mismos términos que aparecen subrayados dentro de los artículos,
          reunidos aquí en una sola página.
        </p>
      </header>

      {/* A definition list in two columns, separated by hairlines: the term is
          the link, the one-line definition reads under it. */}
      <ul className="mt-10 grid border-t border-border font-sans sm:grid-cols-2 sm:gap-x-10">
        {entries.map(([id, entry]) => (
          <li key={id} className="border-b border-border">
            <Link href={`/glosario/${id}`} className="group block py-5">
              <h2 className="text-h3 transition-colors group-hover:text-accent-ink">
                {entry.title}
              </h2>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">
                {entry.def}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <PuenteNbi guia="agente" campana="glosario" />
    </Container>
  );
}
