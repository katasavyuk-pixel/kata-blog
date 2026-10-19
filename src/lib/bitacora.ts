import { bitacora, type EntradaBitacora } from "#site/content";

export type { EntradaBitacora };

/** Published entries, newest first; same day, the file name decides (it starts with the date). */
export const entradasBitacora: EntradaBitacora[] = [...bitacora]
  .filter((entrada) => !entrada.draft)
  .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.slug.localeCompare(a.slug));

export function ultimaEntrada(): EntradaBitacora | undefined {
  return entradasBitacora[0];
}

/** «2026-10» → entries of that month, months newest first. */
export function porMes(entradas: readonly EntradaBitacora[]): { mes: string; entradas: EntradaBitacora[] }[] {
  const meses = new Map<string, EntradaBitacora[]>();
  for (const entrada of entradas) {
    const mes = entrada.fecha.slice(0, 7);
    meses.set(mes, [...(meses.get(mes) ?? []), entrada]);
  }
  return [...meses].map(([mes, lista]) => ({ mes, entradas: lista }));
}

/** Entries dated inside a week (both ends included), for the weekly edition. */
export function entradasEntre(desde: string, hasta: string): EntradaBitacora[] {
  // `fecha` is a full ISO timestamp; compare the day, or the last day of the week drops out.
  return entradasBitacora.filter((entrada) => entrada.fecha.slice(0, 10) >= desde && entrada.fecha.slice(0, 10) <= hasta);
}
