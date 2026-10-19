import type { Perspectivas } from "@/lib/impacto";
import { buildPortada, type PortadaPost } from "@/lib/noticias-portada";

/**
 * What the front page shows, decided from what is published and nothing else.
 *
 * The page has three zones (the news, what is signed, the workshop) and one
 * thing that ties them: a triad, a signed piece that was written because of a
 * news item and that names what in the catalogue deals with it. Every block is
 * null or empty when there is nothing real to put in it, and the page renders
 * no heading over an empty block: four withdrawn redesigns had sections that
 * existed before their content did.
 *
 * `faltan` is the same idea turned on the page itself: what is missing for it
 * to deserve being the home. It has to stay empty: tests/portada-home.test.ts
 * fails the build if a triad or a zone's minimum is lost.
 *
 * Pure: plain objects in, plain objects out. The reading of files and
 * collections is src/lib/portada-lectura.ts; tests/portada-home.test.ts runs
 * this with made-up posts.
 */

/** A news edition older than this is no longer «today» (same grace as the cadence label). */
export const DIAS_AL_DIA = 2;
export const MAX_BREVES = 5;
export const MAX_TRIADAS = 2;
export const MAX_LECTURAS = 3;
export const MAX_SISTEMAS = 2;

/** What the page needs to be the home. Counts of published things. */
export const MINIMOS = { triadas: 1, reflexiones: 3, activos: 3 } as const;

export type Breve = {
  url: string;
  /** What the reader reads: the edition's own headline, or the source's. */
  titular: string;
  medio: string;
  eje: string;
};

export type Triada<P, I> = {
  /** What happened. Automated, and labelled as such where it is shown. */
  noticia: P;
  /** What was written because of it. Signed. */
  pieza: P;
  /** What in the catalogue deals with it; null while the piece names nothing. */
  activo: I | null;
};

export type Portada<P, I, A, S> = {
  /** The day's lead story, with its three readings when it has them. */
  primera: { articulo: P; lecturas: Perspectivas | null; alDia: boolean } | null;
  /** The rest of the newest edition, without the lead's own source. */
  breves: { edicion: P; items: Breve[]; alDia: boolean } | null;
  /** Complete triads first, then newest. */
  triadas: Triada<P, I>[];
  /** Signed reading that is not already in a triad above. */
  lecturas: P[];
  taller: { activos: A[]; totalActivos: number; sistemas: P[]; totalSistemas: number } | null;
  /** The newest weekly edition that went out. */
  semana: S | null;
  /** What is missing for this page to deserve being the home; empty when nothing is. */
  faltan: string[];
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const dias = (desde: string, hasta: string) => (Date.parse(hasta) - Date.parse(desde)) / MS_POR_DIA;

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function construirPortada<P extends PortadaPost, I, A, S>({
  noticias,
  reflexiones,
  guias,
  sistemas,
  activos,
  destacados,
  semanas,
  breves,
  lecturas,
  fuenteDe,
  relaciones,
  hoy,
}: {
  /** Everything the news system published: lead articles and editions. */
  noticias: readonly P[];
  /** Newest first, each list. */
  reflexiones: readonly P[];
  guias: readonly P[];
  sistemas: readonly P[];
  /** Every installable asset, and the short sample a listing shows. */
  activos: readonly A[];
  destacados: readonly A[];
  /** Weekly editions that went out, newest first. */
  semanas: readonly S[];
  /** The items of an edition. */
  breves: (edicion: P) => readonly Breve[];
  /** The three readings of a lead article, or null. */
  lecturas: (articulo: P) => Perspectivas | null;
  /** The source a lead article was written from, to keep it out of the briefs. */
  fuenteDe: (articulo: P) => string | undefined;
  relaciones: (pieza: P) => { aRaizDe: readonly P[]; seResuelveCon: readonly I[] };
  /** ISO date or datetime: when the page is rendered. */
  hoy: string;
}): Portada<P, I, A, S> {
  const { lead, latestEdition, leadIsCurrent } = buildPortada([...noticias]);
  const esNoticia = new Set(noticias.map((post) => post.slug));
  const alDia = (post: P) => dias(post.date, hoy) <= DIAS_AL_DIA;

  const primera = lead
    ? { articulo: lead, lecturas: lecturas(lead), alDia: leadIsCurrent && alDia(lead) }
    : null;

  const fuente = lead ? fuenteDe(lead) : undefined;
  const items = latestEdition
    ? breves(latestEdition)
        .filter((item) => item.url !== fuente)
        .slice(0, MAX_BREVES)
    : [];
  const edicion = latestEdition && items.length > 0 ? { edicion: latestEdition, items, alDia: alDia(latestEdition) } : null;

  const firmadas = [...reflexiones, ...guias].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const todas: Triada<P, I>[] = firmadas.flatMap((pieza) => {
    const { aRaizDe, seResuelveCon } = relaciones(pieza);
    const noticia = aRaizDe.find((post) => esNoticia.has(post.slug));
    return noticia ? [{ noticia, pieza, activo: seResuelveCon[0] ?? null }] : [];
  });
  // Stable sort: `firmadas` is already newest first.
  const triadas = [...todas].sort((a, b) => Number(b.activo !== null) - Number(a.activo !== null)).slice(0, MAX_TRIADAS);
  const enTriada = new Set(triadas.map((triada) => triada.pieza.slug));

  const completas = todas.filter((triada) => triada.activo !== null).length;
  const faltan: string[] = [];
  if (completas < MINIMOS.triadas) {
    faltan.push(
      `Una tríada completa: una pieza firmada que nazca de una noticia («a_raiz_de») y nombre lo que la resuelve en el catálogo («se_resuelve_con»). Hoy hay ${plural(todas.length, "pieza enlazada", "piezas enlazadas")} a una noticia y ${completas} con las tres partes.`,
    );
  }
  if (reflexiones.length < MINIMOS.reflexiones) {
    faltan.push(`Reflexiones: ${reflexiones.length} de ${MINIMOS.reflexiones}.`);
  }
  if (activos.length < MINIMOS.activos) {
    faltan.push(`Activos instalables en el catálogo: ${activos.length} de ${MINIMOS.activos}.`);
  }
  // Whether the news is fresh is not on this list: it changes with the clock,
  // and the page already says so itself (`alDia`). What is asked for is that
  // the zone exists.
  if (!latestEdition) faltan.push("Noticias: no hay ninguna edición publicada.");

  return {
    primera,
    breves: edicion,
    triadas,
    lecturas: firmadas.filter((pieza) => !enTriada.has(pieza.slug)).slice(0, MAX_LECTURAS),
    taller:
      activos.length > 0 || sistemas.length > 0
        ? {
            activos: [...destacados],
            totalActivos: activos.length,
            sistemas: sistemas.slice(0, MAX_SISTEMAS),
            totalSistemas: sistemas.length,
          }
        : null,
    semana: semanas[0] ?? null,
    faltan,
  };
}
