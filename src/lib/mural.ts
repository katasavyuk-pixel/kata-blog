import { LOGOS_DE_SKILL } from "@/config/logos";
import { FORMATOS, etiquetaDeEje } from "@/config/taxonomy";
import { ACTIVOS } from "@/lib/catalogo";
import type { PortadaLeida } from "@/lib/portada-lectura";
import { esNuevo, tituloEnFrase } from "@/lib/portada-texto";

/**
 * What the home's mural shows (2026-10-15, Kata chose «D»: three moving
 * columns of cards). Everything comes from published content: the day's
 * edition, the marketplace and the latest signed articles.
 *
 * Pure apart from the collections: the hero passes the front page it already
 * read, and tests/mural.test.ts runs it against the real content.
 */

export type Imagen = { src: string; width: number; height: number; blurDataURL?: string };

export type Pieza = {
  id: string;
  href: string;
  /** Opens another site (a news source): new tab, and said so. */
  externo: boolean;
  kicker: string;
  titulo: string;
  pie?: string;
  nuevo?: boolean;
} & (
  | { estilo: "foto"; imagen: Imagen }
  | { estilo: "tinta" | "papel" | "rojo" }
  | { estilo: "skill"; color: string; icono: string; foto?: string }
);

export type Columna = {
  id: "noticias" | "skills" | "articulos";
  etiqueta: string;
  href: string;
  total: number;
  /** Seconds a full lap takes: about the same speed for every column, whatever it holds. */
  segundos: number;
  sentido: "sube" | "baja";
  piezas: Pieza[];
};

/** How long each card stays on its way through, in seconds. */
const SEGUNDOS_POR_PIEZA = 11;
const MAX_ARTICULOS = 9;

/** «2026-10-15T…» → «15 oct». */
function diaCorto(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "");
}

export function columnasDelMural(
  { primera, breves, firmadas }: Pick<PortadaLeida, "primera" | "breves" | "firmadas">,
  ahora = new Date(),
): Columna[] {
  const noticias: Pieza[] = [];
  if (primera) {
    const { articulo } = primera;
    const comun = {
      id: articulo.slug,
      href: articulo.permalink,
      externo: false,
      kicker: primera.alDia ? "La noticia del día" : "La última noticia",
      titulo: tituloEnFrase(articulo.title),
      pie: articulo.fuente_medio,
    };
    noticias.push(articulo.cover ? { ...comun, estilo: "foto", imagen: articulo.cover } : { ...comun, estilo: "tinta" });
  }
  for (const [i, breve] of (breves?.items ?? []).entries()) {
    noticias.push({
      id: breve.url,
      href: breve.url,
      externo: true,
      estilo: i % 2 === 0 ? "tinta" : "papel",
      kicker: etiquetaDeEje(breve.eje),
      titulo: breve.titular,
      pie: breve.medio,
    });
  }

  const skills: Pieza[] = ACTIVOS.flatMap((activo) => {
    const logo = LOGOS_DE_SKILL[activo.id];
    if (!logo) return [];
    return [
      {
        id: activo.id,
        href: activo.href,
        externo: false,
        estilo: "skill" as const,
        color: logo.color,
        icono: logo.icono,
        foto: logo.foto,
        kicker: "Skill",
        titulo: activo.title,
        pie: logo.lema,
      },
    ];
  });

  const articulos: Pieza[] = [...firmadas]
    .filter((post) => post.formato !== "radar" && post.formato !== "leccion")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_ARTICULOS)
    .map((post, i) => {
      const comun = {
        id: post.slug,
        href: post.permalink,
        externo: false,
        kicker: `${diaCorto(post.date)} · Publicado`,
        titulo: post.title,
        pie: FORMATOS[post.formato],
        nuevo: esNuevo(post.date, ahora),
      };
      return post.cover ? { ...comun, estilo: "foto" as const, imagen: post.cover } : { ...comun, estilo: i % 2 === 0 ? ("tinta" as const) : ("papel" as const) };
    });

  const columna = (
    id: Columna["id"],
    etiqueta: string,
    href: string,
    sentido: Columna["sentido"],
    piezas: Pieza[],
    total = piezas.length,
  ): Columna => ({ id, etiqueta, href, total, sentido, piezas, segundos: Math.max(1, piezas.length) * SEGUNDOS_POR_PIEZA });

  return [
    columna("noticias", "Noticias de hoy", "/noticias", "sube", noticias),
    columna("skills", "Skills", "/marketplace", "baja", skills),
    columna("articulos", "Artículos", "/blog", "sube", articulos),
  ].filter((c) => c.piezas.length > 0);
}
