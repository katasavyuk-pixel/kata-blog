/**
 * The diagnosis NBI offers, which lives on ianexora.com. Nothing here may grow
 * a price, deadline or deliverable; `tests/diagnostico-fuera-del-indice.test.ts`
 * guards this object.
 */
export const NBI_DIAGNOSTICO = {
  nombre: "Diagnóstico de procesos",
  url: "https://ianexora.com/servicios/diagnostico-de-procesos",
} as const;

/** The same utm convention as the article links (`identidad-autor.test.ts`). */
export function nbiDiagnosticoUrl(medium: string, campaign: string): string {
  return `${NBI_DIAGNOSTICO.url}?utm_source=blog&utm_medium=${medium}&utm_campaign=${campaign}`;
}

/** Two sentences every exit can share: what it is, and what the first step costs. */
export const NBI_DIAGNOSTICO_TEXTO =
  "En NBI (Nexora Business Intelligence) miro cómo funciona hoy y te digo qué cambio compensa, con tus números. La llamada es gratis y dura 20 minutos.";
