import type { ResolvedLibraryItem } from "@/lib/library";
import { resolveLibraryItem } from "@/lib/library";
import { ACTIVOS, activosDestacados, type ActivoResuelto } from "@/lib/catalogo";
import { medioDe } from "@/lib/medios";
import { semanasPublicadas, type SemanaPublicada } from "@/lib/mensual";
import { construirPortada, type Portada } from "@/lib/portada-home";
import { getNoticias, getPostsByEstante, type Post } from "@/lib/posts";
import { relacionesDe } from "@/lib/relaciones";

/**
 * The front page, read from what is published.
 *
 * Everything that decides is in src/lib/portada-home.ts. This file only hands
 * it the collections. The two things that live in a post's body rather than in
 * its frontmatter (the items of an edition, the three readings of a lead
 * article) come already read from the content build (velite.config.ts), so
 * nothing here opens a file: the home revalidates at runtime, where
 * content/posts is not guaranteed to be.
 */

export type ElementoDelCatalogo = ResolvedLibraryItem & { href: string };

export type PortadaLeida = Portada<Post, ElementoDelCatalogo, ActivoResuelto, SemanaPublicada>;

export function leerPortada(hoy: string = new Date().toISOString()): PortadaLeida {
  return construirPortada({
    noticias: getNoticias(),
    reflexiones: getPostsByEstante("reflexiones"),
    guias: getPostsByEstante("guias"),
    sistemas: getPostsByEstante("sistemas"),
    activos: ACTIVOS,
    destacados: activosDestacados(),
    semanas: semanasPublicadas(),
    breves: (edicion) =>
      edicion.novedades.map((novedad) => ({
        url: novedad.url,
        titular: novedad.titular ?? novedad.title,
        medio: medioDe(novedad.source),
        eje: novedad.axis,
      })),
    lecturas: (articulo) => articulo.lecturas,
    fuenteDe: (articulo) => articulo.fuente_url,
    relaciones: (pieza) => {
      const { aRaizDe, seResuelveCon } = relacionesDe(pieza);
      return {
        aRaizDe,
        // Only what has a page to send the reader to.
        seResuelveCon: seResuelveCon.flatMap((item) => {
          const resuelto = resolveLibraryItem(item);
          return resuelto?.href ? [{ ...resuelto, href: resuelto.href }] : [];
        }),
      };
    },
    hoy,
  });
}
