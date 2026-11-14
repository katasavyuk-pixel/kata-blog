/**
 * Sectors a reader actually looks for (peluquerías, inmobiliarias…).
 *
 * This is a closed list, like `tema` and `formato`. A page is generated only
 * when at least one published editorial post belongs to that sector, so an
 * empty vertical never gets a thin URL. Membership is derived from existing
 * tags — the vocabulary already in the posts — rather than a new frontmatter
 * field that would have to be backfilled.
 *
 * `/blog/tag/<tag>` stays `noindex` (free-text long-tail). A sector page is
 * the indexable grouping, and `tagHref` sends those tags here.
 *
 * Clínicas is not listed yet: there is no published editorial post tagged
 * for that sector, and an unused description would be filler.
 */
export const SECTOR_KEYS = [
  "inmobiliarias",
  "peluquerias",
  "hosteleria",
] as const;

export type Sector = (typeof SECTOR_KEYS)[number];

export const SECTORES: Record<
  Sector,
  { label: string; description: string; tags: readonly string[] }
> = {
  inmobiliarias: {
    label: "Inmobiliarias",
    description:
      "Qué hace y qué no el asistente de WhatsApp de NBI para inmobiliarias: está en pruebas, con una demo, sin clientes de agencia todavía.",
    tags: ["inmobiliarias"],
  },
  peluquerias: {
    label: "Peluquerías",
    description:
      "Cómo dejar un recepcionista de IA en el WhatsApp de una peluquería: qué datos necesita, un texto para pegar, cómo probarlo y qué no debe hacer.",
    tags: ["peluqueria", "peluquerias"],
  },
  hosteleria: {
    label: "Hostelería",
    description:
      "Cómo construí MaitreAI, un agente de reservas para restaurantes, y por qué una IA no lo recomendaba.",
    tags: ["hosteleria", "restaurantes"],
  },
};

const TAG_A_SECTOR = new Map<string, Sector>(
  SECTOR_KEYS.flatMap((sector) => SECTORES[sector].tags.map((tag) => [tag, sector] as const)),
);

export function esSector(valor: string): valor is Sector {
  return (SECTOR_KEYS as readonly string[]).includes(valor);
}

export function sectorDeEtiqueta(tag: string): Sector | undefined {
  return TAG_A_SECTOR.get(tag);
}

export function rutaDeSector(sector: Sector): string {
  return `/blog/sector/${sector}`;
}

export const RUTA_SECTORES = "/blog/sectores";
