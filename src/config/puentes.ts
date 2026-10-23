/**
 * The bridge from each article to a guide on ianexora.com (brief of 17-oct-2026).
 *
 * Only guides, never a service, the prices or the diagnosis: the Kata/NBI
 * frontier (7-oct-2026) is that here one sees and
 * learns, and on NBI one hires. A guide is learning, so it fits on either
 * side; the hiring exit stays where it was, in the closing of the posts marked
 * `nbiRelacionado`. The link text is the guide's own title, as its page shows
 * it, so the reader knows where they land.
 */

export const GUIAS_NBI = {
  agente: {
    ruta: "/guias/que-es-un-agente-de-ia",
    titulo: "Qué es un agente de IA, y qué no es",
  },
  rpa: {
    ruta: "/guias/automatizacion-rpa-o-agente-de-ia",
    titulo: "Automatización, RPA o agente de IA: cuál te hace falta",
  },
  medir: {
    ruta: "/guias/como-medir-si-una-automatizacion-funciona",
    titulo: "Cómo medir si una automatización funciona",
  },
  mapa: {
    ruta: "/guias/antes-de-la-ia-el-mapa",
    titulo: "Antes de la IA, el mapa: cuatro preguntas para tu proceso",
  },
} as const;

export type GuiaNbi = keyof typeof GUIAS_NBI;

/** Which guide continues each article. A post not listed here gets none. */
export const PUENTE_POR_POST: Record<string, GuiaNbi> = {
  "como-instalar-skills-en-claude": "agente",
  "por-que-hago-esto": "mapa",
  "cuanto-cuesta-un-agente-de-ia": "medir",
  "cuando-la-ia-se-abarata-el-coste-cambia-de-sitio": "medir",
  "que-proceso-automatizar-primero": "mapa",
  "no-me-da-la-vida": "mapa",
  "astra-y-el-modelo-que-se-escapo": "agente",
  "lo-que-me-cuesta-avanzar": "mapa",
  "cloudflare-agent-readiness": "agente",
  "medir-un-sistema": "medir",
  "que-es-un-agente": "rpa",
  "como-hice-maitreai": "agente",
  "maitreai-geo": "agente",
  "antes-del-tms-tu-inbox": "rpa",
  "vida-de-un-prompt": "agente",
  "que-es-un-token": "rpa",
  "temperatura-y-aleatoriedad": "rpa",
  bienvenida: "mapa",
  "cuanto-cuesta-la-ia": "medir",
  "cuando-la-ia-alucina": "rpa",
  "que-es-rag": "agente",
  "antes-de-delegar-a-un-agente-escribo-cuatro-cosas": "medir",
  "quien-tiene-las-llaves-de-tu-correo": "agente",
};

/** The guide's URL with the blog's UTM convention (`utm_medium=puente`). */
export function urlDeGuia(guia: GuiaNbi, campana: string): string {
  return `https://ianexora.com${GUIAS_NBI[guia].ruta}?utm_source=blog&utm_medium=puente&utm_campaign=${campana}`;
}

/** The bridge of one article, or null if it has none. */
export function puenteDe(slug: string): { href: string; titulo: string } | null {
  const guia = PUENTE_POR_POST[slug];
  return guia ? { href: urlDeGuia(guia, slug), titulo: GUIAS_NBI[guia].titulo } : null;
}

/** The words before the link: neutral on purpose, it points to reading, not to hiring. */
export const PUENTE_ENTRADA = "Para seguir con esto, una guía de NBI:";
