import type { Metadata } from "next";
import { feedAlternates, withOpenGraph } from "@/config/site";
import { sentIssues, type NewsletterIssue } from "@/lib/newsletter-archive";
import { escapeHtml } from "@/lib/email-template";
import { rotuloDeImportante } from "@/lib/edicion";
import { TITULO_IMPORTANTE, rangoLegible, seccion, seccionDeNoticias } from "@/lib/semanal";

/**
 * The month, built from what a person signed.
 *
 * A monthly page is the one news page with a chance in search ("novedades de
 * IA de octubre 2026"), and for that very reason it cannot be made of the daily
 * editions: those are written by a model, read by nobody before they go out,
 * and kept out of the index. It is made of the weekly editions instead, and
 * only of the ones already sent, so a month exists here from the first weekly
 * edition that went out in it and grows with each one after.
 *
 * Pure over the list it is given; the default is the public archive. The
 * metadata lives here and not in the page for the same reason as src/lib/seo.ts:
 * tests/semanal.test.ts calls it directly.
 */

export type SemanaPublicada = {
  issue: string;
  permalink: string;
  /** "del 12 al 18 de octubre". */
  rango: string;
  /** Last day covered, AAAA-MM-DD: the month the week is filed under. */
  hasta: string;
  /** The news section of the edition, as the subscribers read it. */
  noticiasHtml: string;
};

export type EdicionEnviable = Pick<
  NewsletterIssue,
  "issue" | "tipo" | "semana" | "sent" | "permalink" | "html" | "importante"
>;

/**
 * «Lo importante de esta semana» as the monthly page shows it: the card's
 * title, the editor's text (the body's section of that name) and its link. It
 * heads the week on the monthly page, as it heads the email.
 */
function importanteHtml(edicion: EdicionEnviable): string | null {
  const texto = seccion(edicion.html, TITULO_IMPORTANTE);
  const tarjeta = edicion.importante;
  if (!texto && !tarjeta) return null;
  return [
    tarjeta?.titulo ? `<p><strong>${escapeHtml(tarjeta.titulo)}</strong></p>` : null,
    texto,
    tarjeta?.url ? `<p><a href="${escapeHtml(tarjeta.url)}">${escapeHtml(rotuloDeImportante(tarjeta))}</a></p>` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** "&" as it shows up inside an attribute: Velite writes `&#x26;`, hand-made HTML `&amp;`. */
const AMPERSAND = /&(?:amp|#x26|#38);/gi;

/**
 * The email's links to this site carry `utm_source=newsletter`, which is true
 * in an inbox and false on a web page: left in, every click from the monthly
 * page would be counted as a click from the newsletter.
 */
export function sinUtm(html: string): string {
  return html.replace(/href="([^"]*)"/g, (entero, href: string) => {
    const [antes, ...ancla] = href.replace(AMPERSAND, "&").split("#");
    const [ruta, ...consulta] = antes.split("?");
    const pares = consulta.join("?").split("&").filter(Boolean);
    const resto = pares.filter((par) => !par.startsWith("utm_"));
    if (resto.length === pares.length) return entero;
    const limpio = [ruta, resto.length > 0 ? `?${resto.join("&")}` : "", ancla.length > 0 ? `#${ancla.join("#")}` : ""].join("");
    return `href="${limpio.replace(/&/g, "&amp;")}"`;
  });
}

/** Sent weekly editions that carry a news section, newest first. */
export function semanasPublicadas(ediciones: readonly EdicionEnviable[] = sentIssues): SemanaPublicada[] {
  return ediciones
    .flatMap((edicion) => {
      if (!edicion.sent || edicion.tipo !== "semanal" || !edicion.semana) return [];
      const partes = [importanteHtml(edicion), seccionDeNoticias(edicion.html)];
      const noticias = partes.filter(Boolean).join("\n");
      if (!noticias) return [];
      const desde = edicion.semana.desde.slice(0, 10);
      const hasta = edicion.semana.hasta.slice(0, 10);
      return [
        {
          issue: edicion.issue,
          permalink: edicion.permalink,
          rango: rangoLegible({ desde, hasta }),
          hasta,
          noticiasHtml: sinUtm(noticias),
        },
      ];
    })
    .sort((a, b) => b.hasta.localeCompare(a.hasta));
}

/** Months that have a page, as "AAAA-MM", newest first. */
export function mesesPublicados(ediciones: readonly EdicionEnviable[] = sentIssues): string[] {
  return [...new Set(semanasPublicadas(ediciones).map((semana) => semana.hasta.slice(0, 7)))];
}

/** A week belongs to the month of its last day. */
export function semanasDelMes(mes: string, ediciones: readonly EdicionEnviable[] = sentIssues): SemanaPublicada[] {
  return semanasPublicadas(ediciones).filter((semana) => semana.hasta.startsWith(`${mes}-`));
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * "octubre 2026" for "2026-10"; null for anything that is not a month. Without
 * the "de" a date would take: it is how the search is typed, and it keeps the
 * longest month inside the title limit.
 */
export function nombreDeMes(mes: string): string | null {
  const partes = mes.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  return partes ? `${MESES[Number(partes[2]) - 1]} ${partes[1]}` : null;
}

export const rutaDeMes = (mes: string): string => `/noticias/${mes}`;

/** The page's H1: the search, then the lens. */
export const tituloDeMes = (nombre: string): string =>
  `Novedades de IA de ${nombre}: qué cambia para tu negocio`;

/** Null when the month has no page. */
export function metadataDeMes(mes: string, ediciones: readonly EdicionEnviable[] = sentIssues): Metadata | null {
  const nombre = nombreDeMes(mes);
  if (!nombre || semanasDelMes(mes, ediciones).length === 0) return null;
  // The whole <title>: the search someone types, without the site suffix.
  const title = `Novedades de IA de ${nombre} para tu negocio`;
  const description = `Lo que cambió en IA en ${nombre} y qué supone si llevas un negocio: las noticias de cada semana, leídas antes de enviarse y con su fuente.`;
  return withOpenGraph(rutaDeMes(mes), {
    title: { absolute: title },
    description,
    alternates: { ...feedAlternates, canonical: rutaDeMes(mes) },
  });
}
