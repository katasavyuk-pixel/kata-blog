/**
 * The build log («Bitácora», 2026-10-15): what Kata ships, date by date, like a
 * company's changelog. Closed vocabulary, same reason as the taxonomy: a typo
 * fails the build instead of creating a project of one.
 *
 * Not «novedades»: that name is taken by the news items of the daily edition
 * (src/lib/novedades.ts), and «Noticias» sits next to it in the header.
 */
export const PROYECTO_KEYS = ["blog", "skills", "noticias", "newsletter", "canal", "maitreai"] as const;
export type Proyecto = (typeof PROYECTO_KEYS)[number];

export const PROYECTOS: Record<Proyecto, string> = {
  blog: "Blog",
  skills: "Skills",
  noticias: "Noticias",
  newsletter: "Newsletter",
  canal: "Canal",
  maitreai: "MaitreAI",
};

export const TIPO_ENTRADA_KEYS = ["lanzamiento", "mejora", "arreglo", "hito"] as const;
export type TipoEntrada = (typeof TIPO_ENTRADA_KEYS)[number];

/** Status is glyph + label, never colour alone (DESIGN.md). */
export const TIPOS_ENTRADA: Record<TipoEntrada, { label: string; glifo: string }> = {
  lanzamiento: { label: "Lanzamiento", glifo: "●" },
  mejora: { label: "Mejora", glifo: "▲" },
  arreglo: { label: "Arreglo", glifo: "■" },
  hito: { label: "Hito", glifo: "◆" },
};

/** Where an entry proves itself: a page of this site, or a public URL. Never a private repository. */
export const ENLACE_BITACORA = /^(\/[^\s]*|https:\/\/[^\s]+)$/;
