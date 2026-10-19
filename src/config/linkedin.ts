/**
 * Kata's LinkedIn posts shown on the site (2026-10-15: «publicaciones de
 * LinkedIn, sí, pero que no sea con vídeo vertical»). Read off his profile that
 * day, with his permission. Shown as cards in the site's own style, never the
 * LinkedIn iframe: the embed sets LinkedIn's cookies before anyone clicks, and
 * it cannot take the brand's type or colour.
 *
 * `extracto` is his own words, shortened, without emoji. What is left out on
 * purpose (tests/linkedin.test.ts keeps it out):
 * - the vertical video of 4 Sept;
 * - posts in the plural of a company («en NBI observamos», «estamos
 *   construyendo», «tenemos una solución», «dirijo una empresa»):
 *   the site's voice is first person singular on every surface.
 *
 * The id of a LinkedIn activity carries its date (milliseconds in the bits
 * above the 22nd): the test checks `fecha` against it.
 */
export type PublicacionLinkedIn = {
  /** The number in urn:li:activity:<id>. A string: it does not fit in a JS number. */
  id: string;
  fecha: string;
  extracto: string;
};

export const PUBLICACIONES_LINKEDIN: readonly PublicacionLinkedIn[] = [
  {
    id: "7516523663756566531",
    fecha: "2026-10-15",
    extracto:
      "Me dio un poco de vértigo abrir el registro de mi propio agente de IA. Entre el 5 de septiembre y el 13 de octubre: 40 ejecuciones, 29 fallidas. Y aquí viene la parte incómoda: las horas que dediqué a reparar fallos no las medí.",
  },
  {
    id: "7512854162896945152",
    fecha: "2026-10-05",
    extracto:
      "Antes de meter IA… ¿puedes dibujar el proceso en una hoja? Si no, aún no toca automatizar. Dónde se atasca de verdad, por qué un agente sin dueño solo mueve el lío y el filtro en tres pasos: mapa, decide, construye.",
  },
  {
    id: "7508539462923063296",
    fecha: "2026-09-23",
    extracto:
      "¿Tu empresa tendrá que dejar el papel en 2027 por eFTI? No. Desde el 9 de julio de 2027, las autoridades de la UE deberán aceptar información regulatoria de transporte mediante plataformas eFTI certificadas. Para las empresas, adoptar eFTI sigue siendo voluntario por ahora.",
  },
  {
    id: "7500663386146267136",
    fecha: "2026-09-01",
    extracto:
      "El hype de la IA está vendiendo herramientas. Las empresas están comprando esperanza. La IA no falla porque sea débil. Falla porque se usa para tapar un proceso que nadie midió.",
  },
  {
    id: "7498752940233359360",
    fecha: "2026-08-27",
    extracto:
      "No quería presentar MaitreAI como algo que todavía no es. Lo construí para atender reservas de restaurantes por WhatsApp y voz. Le pregunté a una IA qué agente recomendaría para gestionar reservas en un restaurante. MaitreAI no apareció.",
  },
  {
    id: "7496313205145845762",
    fecha: "2026-08-20",
    extracto:
      "Antes de automatizar, diagnostica. El primer paso es identificar qué está afectando realmente al negocio: el tiempo, los datos o el margen. Después, observa, prioriza y automatiza.",
  },
];

export function urlDePublicacion(publicacion: Pick<PublicacionLinkedIn, "id">): string {
  return `https://www.linkedin.com/feed/update/urn:li:activity:${publicacion.id}/`;
}
