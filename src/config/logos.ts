/**
 * The marketplace's logos (2026-10-14): one colour per skill, so the catalogue
 * has a face of its own. Kata chose colour here, and only here: the rest of
 * the site keeps the brand's black and red. No colour from the other two brands:
 * not NBI's cyan, not MaitreAI's amber.
 *
 * Each glyph is one SVG path on a 24×24 grid, drawn as a stroke in white over
 * the colour. tests/logos.test.ts checks that every installable skill has one,
 * that white reads on every colour (≥ 4.5:1) and that no colour drifts into the
 * other brands' hues.
 */
export type LogoDeSkill = {
  /** The tile's colour. */
  color: string;
  /** One path, stroked, 24×24. */
  icono: string;
  /** What it leaves done, in one short line: the skill's tile in the home mural. */
  lema: string;
  /**
   * Its photo in the home mural (public/skills, made with ChatGPT; the prompt
   * sits next to it in a .webp.json). Without one the tile is the colour and
   * the glyph.
   */
  foto?: string;
};

export const LOGOS_DE_SKILL: Record<string, LogoDeSkill> = {
  // A door and an arrow going in: the one that sets the others up.
  empezar: {
    color: "#e11423",
    icono: "M10 3h9v18h-9 M3 12h10 M10 9l3 3-3 3",
    lema: "El perfil de tu negocio, y por dónde empezar.",
    foto: "/skills/empezar.webp",
  },
  // An invoice and a clock: what is owed, and for how long.
  "reclamar-facturas": {
    color: "#1e7a4a",
    icono: "M13 21H6V3h9l4 4v4 M15 3v4h4 M14 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M17.5 16v1.7l1.2.8",
    lema: "Lo que te deben, con los intereses que añade la ley.",
    foto: "/skills/reclamar-facturas.webp",
  },
  // An eye: whether an assistant can see your site.
  "visibilidad-en-ia": {
    color: "#5b3cc4",
    icono: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
    lema: "Si un asistente de IA encuentra y lee tu web.",
    foto: "/skills/visibilidad-en-ia.webp",
  },
  // A document becoming a table.
  "datos-de-documentos": {
    color: "#1f5fbf",
    icono: "M12 15H4V3h8l3 3v5 M11 13h10v8H11z M11 17h10 M16 13v8",
    lema: "De tus PDF y correos a una tabla, con su origen.",
    foto: "/skills/datos-de-documentos.webp",
  },
  // A line over a baseline: the cash, week by week.
  "prever-caja": {
    color: "#b0306a",
    icono: "M3 20h18 M4 15l4-4 4 3 5-7 3 3",
    lema: "Trece semanas de caja: en cuál te quedas corto.",
    foto: "/skills/prever-caja.webp",
  },
  // A calendar with a tick: the quarter, closed.
  "cerrar-trimestre": {
    color: "#3d4451",
    icono: "M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4 M8.5 15.5l2.5 2.5 4.5-5",
    lema: "Los errores de las facturas, antes de la gestoría.",
    foto: "/skills/cerrar-trimestre.webp",
  },
};

/** The other brands' accents, which no logo may come close to. */
export const COLORES_DE_OTRAS_MARCAS = {
  nbi: "#00d4ff",
  maitreai: "#f99c00",
} as const;
