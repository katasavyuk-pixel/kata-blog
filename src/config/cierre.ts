/**
 * The standard article/newsletter closing — three exits, always the same three.
 *
 * This replaces a switch on `formato` that showed exactly one of three different
 * calls to action. The switch was not wrong, it was just unmeasurable: a reader
 * never saw the same closing twice, so no habit formed and nothing could be
 * compared. Repetition is what makes a closing work.
 *
 * Strings live here, not in the components, because the same three exits appear
 * on the web (Tailwind) and in email (table-based, inline-styled). Sharing the
 * markup between those two is a classic trap; sharing the copy is the point.
 *
 * The "trabajo" exit is the diagnosis NBI offers today, on ianexora.com (it used to be
 * the priced sprint on /diagnostico). It only renders on posts marked nbiRelacionado;
 * everyone else gets the archive.
 */

import { NBI_DIAGNOSTICO, NBI_DIAGNOSTICO_TEXTO, nbiDiagnosticoUrl } from "@/config/nbi-diagnostico";
import { siteConfig } from "@/config/site";

export type SalidaId = "curso" | "trabajo" | "archivo" | "responder";

export type Salida = {
  id: SalidaId;
  /** Short mono label above the title. */
  kicker: string;
  titulo: string;
  descripcion: string;
  href: string;
  /** Link text. */
  accion: string;
};

export const CIERRE_SALIDAS: readonly Salida[] = [
  {
    id: "curso",
    kicker: "Aprender",
    titulo: "Entiende la IA tocándola",
    descripcion:
      "Un itinerario en orden, de los tokens a medir un sistema. Gratis, sin cuenta, y el progreso se guarda en tu navegador.",
    href: "/empieza-aqui",
    accion: "Ver el itinerario",
  },
  {
    id: "trabajo",
    kicker: "Aplicarlo",
    titulo: "¿Tienes un proceso que se come las horas de tu equipo?",
    descripcion: NBI_DIAGNOSTICO_TEXTO,
    href: nbiDiagnosticoUrl("cierre", "cierre-articulo"),
    accion: `Ver el ${NBI_DIAGNOSTICO.nombre.toLowerCase()}`,
  },
  {
    id: "responder",
    kicker: "Escribirme",
    titulo: "O simplemente responde",
    descripcion:
      "Si algo de aquí te ha servido, o te ha parecido mal, quiero saberlo. Lo leo yo y cambia lo que publico.",
    href: `mailto:${siteConfig.replyEmail}`,
    accion: siteConfig.replyEmail,
  },
] as const;

/**
 * Which exit gets visual weight, derived from the article's format.
 *
 * The three exits always render, in the same order — this only decides emphasis.
 * It is the one piece of the old per-format switch worth keeping: a reader who
 * just finished a beginner lesson is better served by the course than by a
 * pitch, and that judgement was already encoded and correct.
 */
export function salidaDestacada(formato: string): SalidaId {
  if (formato === "leccion") return "curso";
  if (formato === "sistema" || formato === "caso") return "trabajo";
  return "responder";
}
