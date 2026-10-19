/**
 * The reader's lens: from which chair a piece of news is read.
 *
 * A lead article already carries three readings of the same story (management,
 * operations, technology) inside its `<Comparador modo="explorar">`, and the
 * pipeline refuses to publish one without the three (scripts/radar/article-gate.mjs).
 * This module is what lets another page show them: it reads the three out of
 * the article's source, names the lenses in one place, and decides which one a
 * reader gets.
 *
 * Which one shows is never rendered by the server. All three are in the HTML
 * and `data-lente` on <html> picks one in CSS (globals.css, «The reader's
 * lens»), so the page is static, a crawler reads everything and nothing
 * re-renders on hydration. `SCRIPT_LENTE` sets the attribute before paint.
 *
 * Pure: no files, no DOM. tests/lente.test.ts runs the script in a sandbox.
 */

export const LENTES = ["direccion", "operaciones", "tecnologia"] as const;

export type Lente = (typeof LENTES)[number];

/** What a reader sees with nothing chosen, and with JavaScript off. */
export const LENTE_POR_DEFECTO: Lente = "direccion";

export const ETIQUETA_DE_LENTE: Record<Lente, string> = {
  direccion: "Dirección",
  operaciones: "Operaciones",
  tecnologia: "Tecnología",
};

/** The heading over a reading: "Qué cambia desde operaciones". */
export const DESDE_LENTE: Record<Lente, string> = {
  direccion: "Qué cambia desde la dirección",
  operaciones: "Qué cambia desde operaciones",
  tecnologia: "Qué cambia desde tecnología",
};

/** Query parameter and localStorage key. A shared link carries the first. */
export const CLAVE_LENTE = "lente";

export type Perspectivas = Record<Lente, string>;

export function esLente(valor: unknown): valor is Lente {
  return typeof valor === "string" && (LENTES as readonly string[]).includes(valor);
}

/**
 * The link wins over the saved choice: whoever shares «?lente=operaciones» is
 * pointing at that reading. Anything that is not a lens is ignored, never an
 * error: the parameter is typed by strangers.
 */
export function resolverLente({
  consulta,
  guardada,
}: {
  consulta?: string | null;
  guardada?: string | null;
}): Lente {
  if (esLente(consulta)) return consulta;
  if (esLente(guardada)) return guardada;
  return LENTE_POR_DEFECTO;
}

const sinAcentos = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * A reading as a sentence to print: no tags, no markdown marks, one line. A
 * link keeps its words and loses its address; the article is one click away.
 */
function textoPlano(mdx: string): string {
  return mdx
    .replace(/<[^>]+>/g, " ")
    .replace(/!?\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, "$1")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/\s+/g, " ")
    .replace(/ ([,.;:!?»)])/g, "$1")
    .trim();
}

/**
 * The three readings of a lead article, from its MDX. Null unless all three
 * are there and say something: a page that offers a lens and has two readings
 * is worse than one that offers none.
 */
export function perspectivasDe(mdx: string): Perspectivas | null {
  const explorador = mdx.match(/<Comparador\b[^>]*\bmodo="explorar"[^>]*>([\s\S]*?)<\/Comparador>/)?.[1];
  if (!explorador) return null;
  const lecturas: Partial<Perspectivas> = {};
  for (const [, titulo, cuerpo] of explorador.matchAll(/<Lado\s+titulo="([^"]+)"\s*>([\s\S]*?)<\/Lado>/g)) {
    const lente = sinAcentos(titulo);
    const texto = textoPlano(cuerpo);
    if (esLente(lente) && texto) lecturas[lente] = texto;
  }
  return LENTES.every((lente) => lecturas[lente]) ? (lecturas as Perspectivas) : null;
}

/**
 * Runs before the first paint, inline, ahead of anything the lens changes. It
 * always leaves a valid `data-lente` on <html>, so the stylesheet has one case
 * to handle when JavaScript runs and one (no attribute) when it does not.
 * Storage can throw (private mode, blocked cookies): then the link or the
 * default decide.
 */
export const SCRIPT_LENTE = `(function(){var l=${JSON.stringify(LENTES)},d=${JSON.stringify(LENTE_POR_DEFECTO)},k=${JSON.stringify(CLAVE_LENTE)},q=null,s=null;try{q=new URLSearchParams(location.search).get(k)}catch(e){}try{s=localStorage.getItem(k)}catch(e){}document.documentElement.setAttribute("data-lente",l.indexOf(q)>-1?q:l.indexOf(s)>-1?s:d)})()`;
