import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd, datosDe } from "@/lib/jsonld";
import { Container } from "@/components/ui/container";
import { feedAlternates, withOpenGraph } from "@/config/site";
import { RUTA_SECTORES, SECTORES, rutaDeSector } from "@/config/sectores";
import { getPostsBySector, sectoresConContenido } from "@/lib/posts";

export const metadata: Metadata = withOpenGraph(RUTA_SECTORES, {
  title: "Artículos por sector",
  description:
    "Las lecturas de este blog agrupadas por el tipo de negocio del que hablan. Solo aparecen los sectores que ya tienen un artículo publicado.",
  alternates: { ...feedAlternates, canonical: RUTA_SECTORES },
});

const linkClass =
  "font-semibold text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

/**
 * Index of sector pages. Renders only while at least one vertical has a
 * published article; otherwise 404, like /guias while empty.
 */
export default function SectoresPage() {
  const sectores = sectoresConContenido();
  if (sectores.length === 0) notFound();

  const items = sectores.map((sector) => ({
    name: SECTORES[sector].label,
    url: rutaDeSector(sector),
  }));

  return (
    <Container className="py-10 sm:py-14">
      <JsonLd data={coleccionJsonLd({ path: RUTA_SECTORES, ...datosDe(metadata), items })} />
      <header className="max-w-[52ch]">
        <p className="font-sans text-[0.8125rem] font-semibold text-fg">Lecturas</p>
        <h1 className="mt-3 text-h1">Por sector</h1>
        <p className="mt-4 text-muted">
          Los artículos que hablan de un tipo de negocio concreto. Si un sector
          no está, es que todavía no hay una pieza publicada sobre él.
        </p>
      </header>
      <ul className="mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
        {sectores.map((sector) => {
          const meta = SECTORES[sector];
          const n = getPostsBySector(sector).length;
          return (
            <li key={sector} className="border border-border bg-panel p-6">
              <h2 className="font-sans text-[1.1875rem] font-bold leading-tight">
                <Link href={rutaDeSector(sector)} className="hover:text-accent-ink">
                  {meta.label}
                </Link>
              </h2>
              <p className="mt-3 text-[1.0625rem] leading-relaxed">{meta.description}</p>
              <p className="mt-4 font-sans text-[0.9375rem]">
                <Link href={rutaDeSector(sector)} className={linkClass}>
                  {n === 1 ? "1 artículo" : `${n} artículos`}
                </Link>
              </p>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
