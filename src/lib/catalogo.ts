import { CATALOGO } from "@/config/catalogo";
import { LIBRARY_ITEMS } from "@/config/library";
import type { Activo } from "@/lib/evidence";
import { resolveLibraryItem, type ResolvedLibraryItem } from "@/lib/library";

/**
 * The installable part of the library: the items that carry an `activo` and so
 * get a page of their own at /marketplace/<id>.
 *
 * One list, read by the detail route, the /sistemas listing, the home block
 * and the sitemap, so an asset cannot have a page without being listed or be
 * listed without having a page (tests/catalogo.test.ts).
 */
export type ActivoResuelto = ResolvedLibraryItem & { activo: Activo; href: string };

export const ACTIVOS: ActivoResuelto[] = LIBRARY_ITEMS.flatMap((item) => {
  if (!item.activo) return [];
  const resuelto = resolveLibraryItem(item);
  // An asset without a title or a page of its own cannot be shown anywhere:
  // better a failed build than a silent hole in the catalogue.
  if (!resuelto?.href) {
    throw new Error(`LIBRARY_ITEMS["${item.id}"] lleva \`activo\` y le falta título, resumen o href.`);
  }
  return [{ ...resuelto, activo: item.activo, href: resuelto.href }];
});

export function getActivo(id: string): ActivoResuelto | undefined {
  return ACTIVOS.find((item) => item.id === id);
}

/**
 * A short, varied sample for a listing that cannot show them all: the first
 * asset of each theme, in catalogue order. The home shows these, so it does not
 * read as three ways of doing the accounts. The entry skill is left out: it
 * sets the others up and does no office work of its own, so it is a step in
 * every ficha rather than something to show for itself.
 */
export function activosDestacados(limite = 3): ActivoResuelto[] {
  const vistos = new Set<string>();
  return ACTIVOS.filter((item) => {
    if (item.id === CATALOGO.entrada) return false;
    if (vistos.has(item.tema)) return false;
    vistos.add(item.tema);
    return true;
  }).slice(0, limite);
}

/** Where an asset's page lives. The id is the only thing in the URL. */
export function rutaDeActivo(id: string): string {
  return `/marketplace/${id}`;
}

/** "skill" → "Skill". One label per type, for kickers and cards. */
export const TIPO_ACTIVO: Record<Activo["tipo"], string> = {
  skill: "Skill",
  agente: "Agente",
  plantilla: "Plantilla",
};
