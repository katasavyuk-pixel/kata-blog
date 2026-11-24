import { PROYECTOS, TIPOS_ENTRADA } from "@/config/bitacora";
import { LOGOS_DE_SKILL } from "@/config/logos";
import { FORMATOS, etiquetaDeEje } from "@/config/taxonomy";
import { entradasBitacora } from "@/lib/bitacora";
import { ACTIVOS } from "@/lib/catalogo";
import type { PortadaLeida } from "@/lib/portada-lectura";
import { getPost } from "@/lib/posts";

/**
 * What the home's mural shows (2026-10-15, Kata chose «D»: the three running
 * things of the site as moving columns of cards). Everything comes from what
 * is published: the day's edition, the marketplace and the build log, so the
 * mural changes when the site does and nobody keeps it by hand.
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
} & (
  | { estilo: "foto"; imagen: Imagen }
  | { estilo: "tinta" | "papel" | "rojo" }
  | { estilo: "skill"; color: string; icono: string; foto?: string }
);

export type Columna = {
  id: "noticias" | "skills" | "bitacora";
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
const MAX_BITACORA = 9;

/** «2026-10-15T…» → «15 oct». */
function diaCorto(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "");
}

export function columnasDelMural({ primera, breves, firmadas }: Pick<PortadaLeida, "primera" | "breves" | "firmadas">): Columna[] {
  const noticias: Pieza[] = [];
  if (primera) {
    const { articulo } = primera;
    const comun = {
      id: articulo.slug,
      href: articulo.permalink,
      externo: false,
      kicker: primera.alDia ? "La noticia del día" : "La última noticia",
      titulo: articulo.title,
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

  const slugsEnBitacora = new Set(
    entradasBitacora.flatMap((entrada) => {
      const prefijo = "/blog/";
      if (!entrada.enlace.startsWith(prefijo)) return [];
      return [entrada.enlace.slice(prefijo.length).split(/[?#]/)[0]];
    }),
  );
  const elementosBitacora = [
    ...entradasBitacora.map((entrada, orden) => ({ dia: entrada.fecha.slice(0, 10), tipo: "entrada" as const, orden, entrada })),
    ...firmadas
      .filter((post) => !slugsEnBitacora.has(post.slug))
      .map((post, orden) => ({ dia: post.date.slice(0, 10), tipo: "post" as const, orden, post })),
  ].sort((a, b) => b.dia.localeCompare(a.dia) || (a.tipo === b.tipo ? a.orden - b.orden : a.tipo === "post" ? -1 : 1));

  const bitacora: Pieza[] = elementosBitacora.slice(0, MAX_BITACORA).map((elemento, i) => {
    if (elemento.tipo === "post") {
      const { post } = elemento;
      const comun = {
        id: post.slug,
        href: post.permalink,
        externo: false,
        kicker: `${diaCorto(post.date)} · Publicado`,
        titulo: post.title,
        pie: FORMATOS[post.formato],
      };
      return post.cover ? { ...comun, estilo: "foto" as const, imagen: post.cover } : { ...comun, estilo: i % 2 === 0 ? ("tinta" as const) : ("papel" as const) };
    }

    const { entrada } = elemento;
    // An entry about a piece shows that piece's cover.
    const post = entrada.enlace.startsWith("/blog/") ? getPost(entrada.enlace.slice("/blog/".length).split(/[?#]/)[0]) : undefined;
    const comun = {
      id: entrada.slug,
      href: entrada.permalink,
      externo: false,
      kicker: `${diaCorto(entrada.fecha)} · ${TIPOS_ENTRADA[entrada.tipo].label}`,
      titulo: entrada.titulo,
      pie: PROYECTOS[entrada.proyecto],
    };
    if (post?.cover) return { ...comun, estilo: "foto" as const, imagen: post.cover };
    if (entrada.tipo === "hito") return { ...comun, estilo: "rojo" as const };
    return { ...comun, estilo: i % 2 === 0 ? ("tinta" as const) : ("papel" as const) };
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
    columna("bitacora", "Bitácora", "/bitacora", "sube", bitacora, elementosBitacora.length),
  ].filter((c) => c.piezas.length > 0);
}
