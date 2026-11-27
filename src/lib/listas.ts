/**
 * Subscriber lists share one table and one double opt-in, and nothing else.
 *
 * `nbi` is the newsletter this app sends. `kataivanovych` and `club` are the
 * personal site (kataivanovych.com). `bitacora` is only a form alias of
 * `kataivanovych`; it is never stored. A blast, a gift or the welcome
 * sequence that forgets the list will mail the wrong people.
 */

export const LISTA_NBI = "nbi" as const;
export const LISTA_BLOG = "kataivanovych" as const;
export const LISTA_CLUB = "club" as const;

export const LISTAS_ALMACENADAS = [LISTA_NBI, LISTA_BLOG, LISTA_CLUB] as const;
export type ListaAlmacenada = (typeof LISTAS_ALMACENADAS)[number];
export type ListaPersonal = typeof LISTA_BLOG | typeof LISTA_CLUB;

/** Where a well-formed personal signup always lands. Never the form's `origen`. */
export const URL_SUSCRITO = "https://kataivanovych.com/?suscrito=1";
/** Where a confirmed personal signup lands. Not the NBI /gracias page. */
export const URL_CONFIRMADO = "https://kataivanovych.com/?confirmado=1";

const ORIGENES_FORMULARIO = new Set([
  "https://kataivanovych.com",
  "https://www.kataivanovych.com",
]);

export function esListaPersonal(lista: string | null | undefined): lista is ListaPersonal {
  return lista === LISTA_BLOG || lista === LISTA_CLUB;
}

/**
 * The NBI welcome sequence belongs to `nbi` only. A missing list is a row
 * read before migration 0006 (every live row is NBI). Any other value fails
 * closed: confirm the address, do not enrol it in NBI.
 */
export function programaSecuenciaNbi(lista: string | null | undefined): boolean {
  return lista === null || lista === undefined || lista === LISTA_NBI;
}

/** `bitacora` is the name the personal form uses for the blog list. */
export function listaDeFormulario(valor: string | null | undefined): ListaPersonal | null {
  const normalizado = valor?.trim().toLowerCase() ?? "";
  if (normalizado === "bitacora" || normalizado === LISTA_BLOG) return LISTA_BLOG;
  if (normalizado === LISTA_CLUB) return LISTA_CLUB;
  return null;
}

/**
 * Browser POSTs from the personal site. `Origin` wins when both headers are
 * present: a hostile page cannot borrow a kataivanovych.com Referer.
 */
export function origenDeFormularioPermitido(
  origin: string | null,
  referer: string | null,
): boolean {
  const crudo = origin?.trim() || referer?.trim() || "";
  if (!crudo || crudo === "null") return false;
  try {
    return ORIGENES_FORMULARIO.has(new URL(crudo).origin);
  } catch {
    return false;
  }
}
