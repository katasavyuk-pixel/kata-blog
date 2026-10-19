import { ESTANTE_KEYS, TEMA_KEYS, type Estante, type Tema } from "@/config/taxonomy";

/**
 * The archive as one typed stream: everything written by hand, newest first,
 * each piece saying what it is. Two filters narrow it, `?tipo=` (the shelf a
 * piece lives on) and `?tema=`, plus the search box (`?q=`).
 *
 * The rules are here so they can be tested without rendering a page: what a
 * query string is allowed to select, what a filter leaves, how many pieces
 * each option would leave, and the address of each combination.
 *
 * Pure: the page passes the posts in.
 */

/** Shelves the archive can show. News is never one of them: it has its own page. */
export const TIPOS_DE_ARCHIVO = ESTANTE_KEYS.filter(
  (estante): estante is Exclude<Estante, "noticias"> => estante !== "noticias",
);

export type TipoDeArchivo = (typeof TIPOS_DE_ARCHIVO)[number];

export type FiltroDeArchivo = { tipo?: TipoDeArchivo; tema?: Tema; q: string };

export type PiezaDeArchivo = {
  title: string;
  description: string;
  dek?: string;
  tema: Tema;
  formato: string;
  tags: readonly string[];
};

type Parametros = Record<string, string | string[] | undefined>;

const primero = (valor: string | string[] | undefined): string =>
  (Array.isArray(valor) ? valor[0] ?? "" : valor ?? "").trim();

const normalizar = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

/**
 * What the address asks for, kept only when it names something real. `estante`
 * is the parameter this page used before; a link that still carries it filters
 * the same way. Anything unknown is dropped and the whole archive shows: a
 * mistyped filter is not a 404.
 */
export function leerFiltro(params: Parametros): FiltroDeArchivo {
  const tipo = primero(params.tipo) || primero(params.estante);
  const tema = primero(params.tema);
  return {
    ...((TIPOS_DE_ARCHIVO as readonly string[]).includes(tipo) ? { tipo: tipo as TipoDeArchivo } : {}),
    ...((TEMA_KEYS as readonly string[]).includes(tema) ? { tema: tema as Tema } : {}),
    q: primero(params.q).slice(0, 80),
  };
}

function coincide(post: PiezaDeArchivo, q: string): boolean {
  if (!q) return true;
  const texto = normalizar(
    [post.title, post.description, post.dek, post.tema, post.formato, ...post.tags].filter(Boolean).join(" "),
  );
  return texto.includes(normalizar(q));
}

export function filtrar<P extends PiezaDeArchivo>(
  posts: readonly P[],
  filtro: FiltroDeArchivo,
  tipoDe: (post: P) => Estante,
): P[] {
  return posts.filter(
    (post) =>
      (!filtro.tipo || tipoDe(post) === filtro.tipo) &&
      (!filtro.tema || post.tema === filtro.tema) &&
      coincide(post, filtro.q),
  );
}

export type Faceta<K extends string> = { clave: K; n: number; activa: boolean };

/**
 * The options of each filter, each with what choosing it would leave given the
 * other filter and the search. An option that would leave nothing is not
 * offered, unless it is the one selected (so it can be taken off).
 */
export function facetas<P extends PiezaDeArchivo>(
  posts: readonly P[],
  filtro: FiltroDeArchivo,
  tipoDe: (post: P) => Estante,
): { tipos: Faceta<TipoDeArchivo>[]; temas: Faceta<Tema>[] } {
  const sinTipo = filtrar(posts, { ...filtro, tipo: undefined }, tipoDe);
  const sinTema = filtrar(posts, { ...filtro, tema: undefined }, tipoDe);
  const tipos = TIPOS_DE_ARCHIVO.map((clave) => ({
    clave,
    n: sinTipo.filter((post) => tipoDe(post) === clave).length,
    activa: filtro.tipo === clave,
  }));
  const temas = TEMA_KEYS.map((clave) => ({
    clave,
    n: sinTema.filter((post) => post.tema === clave).length,
    activa: filtro.tema === clave,
  }));
  return {
    tipos: tipos.filter((faceta) => faceta.n > 0 || faceta.activa),
    temas: temas.filter((faceta) => faceta.n > 0 || faceta.activa),
  };
}

/** The address of a combination of filters. Always in the same order, and lands on the list. */
export function hrefDeArchivo(filtro: Partial<FiltroDeArchivo>): string {
  const consulta = new URLSearchParams();
  if (filtro.tipo) consulta.set("tipo", filtro.tipo);
  if (filtro.tema) consulta.set("tema", filtro.tema);
  if (filtro.q) consulta.set("q", filtro.q);
  const cadena = consulta.toString();
  return `/blog${cadena ? `?${cadena}` : ""}#archivo`;
}
