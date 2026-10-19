/**
 * Closed editorial vocabulary — two orthogonal axes, both required on a post.
 *
 * Free tags produced 14 terms across 8 posts, 10 of them used exactly once, and
 * a real collision: `construccion-publica` and `construcción pública` are the
 * same topic on two different routes, which is what happens when the taxonomy
 * is whatever somebody typed. Velite validates against these keys, so a typo
 * fails the build instead of quietly inventing a category.
 *
 * `tema` = what it is about. `formato` = what kind of thing it is. They are
 * independent: a `sistema` can be about `captacion` or about `operaciones`.
 * Free `tags` survive as secondary long-tail keywords and drive no navigation.
 *
 * Navigation derives from `formato`, and from nothing else. Every post lands on
 * exactly one shelf (`ESTANTE_POR_FORMATO`): the nav, the home, /sistemas, the
 * /blog filter and the two feeds all read that map, so a piece cannot be a
 * system on one surface and a note on another. "Is this a news edition?" is
 * `formato === "radar"` — never the `radar` tag, never `seccion`.
 *
 * `seccion` is a legacy field. The news bot stamps it on every edition, so it
 * stays in the schema, but no surface reads it any more.
 */

export const TEMA_KEYS = [
  "ia-aplicada",
  "captacion",
  "contenido",
  "operaciones",
  "economia",
] as const;

export type Tema = (typeof TEMA_KEYS)[number];

/** Display labels, in the order the /sistemas blocks render. */
export const TEMAS: Record<Tema, string> = {
  "ia-aplicada": "IA aplicada",
  captacion: "Captación y embudo",
  contenido: "Contenido en automático",
  operaciones: "Operaciones",
  economia: "Economía",
};

export const FORMATO_KEYS = [
  "sistema",
  "prueba",
  "radar",
  "nota",
  "leccion",
  "herramienta",
  "caso",
  // 13-Oct-2026. A `guia` answers a question people type into a search box
  // (what it costs, how it is installed, which one to choose); a `reflexion`
  // is the author's own reading of something. Both used to be `nota`, which
  // is why a cost explainer and a personal essay shared a shelf.
  "guia",
  "reflexion",
] as const;

export type Formato = (typeof FORMATO_KEYS)[number];

/**
 * The one format written by the news system rather than by a person. Indexing,
 * the byline and the structured data all branch on it (`esAutomatico` in
 * src/lib/posts.ts), so it is named here, where nothing has to import Velite's
 * output to read it.
 */
export const FORMATO_AUTOMATICO: Formato = "radar";

/**
 * Legacy. Validated because the news bot still writes it into every edition's
 * frontmatter; read by nothing. Navigation is `ESTANTE_POR_FORMATO` below.
 */
export const SECCION_KEYS = ["ideas", "practica", "radar"] as const;

export type Seccion = (typeof SECCION_KEYS)[number];

/** The shelves a reader navigates, in the order the site presents them. */
export const ESTANTE_KEYS = [
  "sistemas",
  "guias",
  "reflexiones",
  "pruebas",
  "notas",
  "curso",
  "noticias",
] as const;

export type Estante = (typeof ESTANTE_KEYS)[number];

export const ESTANTES: Record<Estante, string> = {
  sistemas: "Sistemas",
  guias: "Guías",
  reflexiones: "Reflexiones",
  pruebas: "Pruebas",
  notas: "Notas",
  curso: "Curso",
  noticias: "Noticias",
};

export const ESTANTE_DESCRIPTIONS: Record<Estante, string> = {
  sistemas: "Lo que ya funciona en mi negocio: qué hace, sus números y qué se rompió.",
  guias: "Lo que se pregunta quien quiere aplicar IA en su negocio —cuánto cuesta, cómo se instala, cuál elegir—, respondido con lo que he montado y con la fuente de cada dato.",
  reflexiones: "Lo que pienso mientras lo construyo: decisiones, dudas y lo que cambia cuando la IA entra en un negocio.",
  pruebas: "Lo que pongo a prueba antes de montarlo, con el resultado tal cual salió.",
  notas: "Notas y herramientas sueltas: lo que aprendo mientras monto los sistemas.",
  curso: "Lecciones interactivas en orden, para entender la IA tocándola.",
  noticias: "Lo importante en IA, tecnología y negocio, verificado contra su fuente y publicado en automático.",
};

/**
 * The one place a format is assigned to a shelf. Typed as a full `Record`, so
 * adding a format without deciding where it lives is a compile error.
 */
export const ESTANTE_POR_FORMATO: Record<Formato, Estante> = {
  sistema: "sistemas",
  caso: "sistemas",
  prueba: "pruebas",
  nota: "notas",
  herramienta: "notas",
  guia: "guias",
  reflexion: "reflexiones",
  leccion: "curso",
  radar: "noticias",
};

/**
 * The page a shelf lives on: where a piece's kicker and breadcrumb lead, and
 * what the archive links to from a shelf's heading. A shelf without a page of
 * its own is a filter of the archive, so it points at /blog. Typed as a full
 * `Record`, like the map above: a new shelf has to say where it lives.
 */
export const RUTA_POR_ESTANTE: Record<Estante, string> = {
  sistemas: "/sistemas",
  guias: "/guias",
  reflexiones: "/reflexiones",
  pruebas: "/blog",
  notas: "/blog",
  curso: "/empieza-aqui",
  noticias: "/noticias",
};

/**
 * News axes: the closed list an item of the daily edition is filed under. The
 * axis is a property of the source (config/radar-sources.json), not a judgement
 * the writing model makes, so the list is checked against that file
 * (tests/taxonomia.test.ts) rather than against what a model typed.
 *
 * `tecnologia` is apart from `ia` since 14 Oct 2026: with one axis for both, a
 * piece on PC shipments and a model release carried the same label, and "IA" on
 * the page meant "anything from a tech outlet".
 */
export const RADAR_AXIS_KEYS = ["ia", "tecnologia", "negocio", "economia", "geopolitica"] as const;

export type RadarAxis = (typeof RADAR_AXIS_KEYS)[number];

export const RADAR_AXES: Record<RadarAxis, string> = {
  ia: "IA",
  tecnologia: "Tecnología",
  negocio: "Negocio",
  economia: "Economía",
  geopolitica: "Geopolítica",
};

/**
 * The label of an axis as a reader sees it. Editions published before the list
 * was closed carry other values (`seguridad`); those are shown as written.
 */
export function etiquetaDeEje(axis: string): string {
  return (RADAR_AXES as Record<string, string>)[axis] ?? axis;
}

export const FORMATOS: Record<Formato, string> = {
  sistema: "Sistema",
  prueba: "Prueba",
  radar: "Noticia",
  nota: "Nota",
  leccion: "Lección",
  herramienta: "Herramienta",
  caso: "Caso real",
  guia: "Guía",
  reflexion: "Reflexión",
};

/**
 * Where a tag chip leads. `radar` is the old name of the news section: its page
 * is /noticias and /blog/tag/radar only redirects there (next.config.ts), so a
 * chip that pointed at the tag route cost every reader — and every crawler that
 * follows links — a 308 on 24 posts.
 */
export function tagHref(tag: string): string {
  return tag === "radar" ? "/noticias" : `/blog/tag/${encodeURIComponent(tag)}`;
}
