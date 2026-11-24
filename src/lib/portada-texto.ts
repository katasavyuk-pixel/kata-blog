/**
 * Put a title that is consistently in Title Case into Spanish sentence case.
 * Mixed-case names and acronyms are left alone because their casing is meaningful.
 */
export function tituloEnFrase(titulo: string): string {
  const palabras = [...titulo.matchAll(/\p{L}[\p{L}\p{M}]*/gu)];
  const candidatas = palabras.filter(([palabra]) => palabra.length >= 4);
  if (candidatas.length === 0) return titulo;

  const capitalizadas = candidatas.filter(([palabra]) => /^\p{Lu}/u.test(palabra));
  if (capitalizadas.length <= candidatas.length / 2) return titulo;

  let indice = 0;
  return titulo.replace(/\p{L}[\p{L}\p{M}]*/gu, (palabra) => {
    const esPrimera = indice++ === 0;
    const esSigla = palabra.length > 1 && palabra === palabra.toLocaleUpperCase('es');
    const tieneMayusculaInterna = /\p{Ll}/u.test(palabra) && /\p{Lu}/u.test(palabra.slice(1));
    return esPrimera || esSigla || tieneMayusculaInterna ? palabra : palabra.toLocaleLowerCase('es');
  });
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Whether a post date falls within the last `dias` days, relative to `ahora`. */
export function esNuevo(fecha: string | Date, ahora: string | Date, dias = 7): boolean {
  const timestamp = typeof fecha === 'string' ? Date.parse(fecha) : fecha.getTime();
  const referencia = typeof ahora === 'string' ? Date.parse(ahora) : ahora.getTime();
  const transcurrido = referencia - timestamp;
  return Number.isFinite(timestamp) && Number.isFinite(referencia) && transcurrido >= 0 && transcurrido <= dias * MS_POR_DIA;
}
