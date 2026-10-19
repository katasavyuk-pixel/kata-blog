import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd, datosDe } from "@/lib/jsonld";
import { BitacoraLista } from "@/components/bitacora/lista";
import { Container } from "@/components/ui/container";
import { feeds, withOpenGraph } from "@/config/site";
import { entradasBitacora } from "@/lib/bitacora";

export const metadata: Metadata = withOpenGraph("/bitacora", {
  title: "Bitácora",
  description:
    "Lo que construyo, fecha a fecha: lanzamientos, mejoras y arreglos del blog, las skills, las noticias, el canal y MaitreAI. Cada entrada enlaza a su prueba.",
  // Like /noticias, it advertises only its own feed.
  alternates: {
    canonical: "/bitacora",
    types: { "application/rss+xml": [{ url: feeds.bitacora.href, title: feeds.bitacora.title }] },
  },
});

/**
 * The build log (Kata, 2026-10-15: «como hacen las empresas que publican sus
 * novedades»). One file per entry in content/bitacora; every entry links to
 * where it can be checked, and the build fails without that link.
 */
export default function BitacoraPage() {
  const entradas = entradasBitacora.map(({ slug, titulo, fecha, proyecto, tipo, enlace, youtubeId, html }) => ({
    slug,
    titulo,
    fecha,
    proyecto,
    tipo,
    enlace,
    youtubeId,
    html,
  }));

  return (
    <Container className="py-10 sm:py-14">
      <JsonLd
        data={coleccionJsonLd({
          path: "/bitacora",
          ...datosDe(metadata),
          items: entradas.map((e) => ({ name: e.titulo, url: `/bitacora#${e.slug}` })),
        })}
      />
      <div className="mx-auto max-w-[52rem]">
        <header>
          <h1 className="text-h1 font-medium">Bitácora</h1>
          <p className="mt-4 max-w-[62ch] text-lede text-muted">
            Lo que construyo, fecha a fecha: lo que lanzo, lo que mejoro y lo que arreglo. Cada entrada enlaza a donde se
            puede comprobar.
          </p>
          <p className="mt-4 font-sans text-[0.9375rem]">
            <a href={feeds.bitacora.href} className="font-semibold text-accent-ink underline underline-offset-[0.18em] hover:decoration-2">
              Síguela por RSS
            </a>
          </p>
        </header>
        <div className="mt-10">
          <BitacoraLista entradas={entradas} />
        </div>
      </div>
    </Container>
  );
}
