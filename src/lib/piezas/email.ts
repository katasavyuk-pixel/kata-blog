/**
 * Email blocks for the interactive pieces. Server only: imported by
 * src/lib/email-blocks.ts, never by a component. (No `server-only` import
 * because the Node test runner loads this file directly.)
 *
 * The rule from lead-magnets.ts holds here too: nothing is printed as the
 * browser sent it. `bloquePieza` parses the stored inputs again and recomputes
 * the result, so an email that carries this site's name only ever says what
 * the model says about the reader's own inputs. Reader-typed text (process
 * names) is length-limited by `parse` and escaped here — including braces,
 * because the welcome sequence refuses to send a body with a `{{…}}` left in
 * it, and a reader naming a process «{{x}}» must not cost them the email.
 *
 * Each block must hand over something the piece did NOT show on screen. The
 * old calculator email was judged «un peaje, no un intercambio» for repeating
 * the page; this is the fix, stated per piece below.
 */

import { emailColors as c } from "@/lib/email-colors";
import { escapeHtml } from "@/lib/email-template";
import {
  CRITERIOS_PROCESOS,
  computeProcesos,
  formatoProcesos,
  parseProcesos,
  esPiezaConEmail,
} from "@/lib/piezas/registry";

const P = `margin:0 0 16px;line-height:1.6;color:${c.textMain};font-size:15px`;
const CELL = `padding:8px 10px;border-bottom:1px solid ${c.border};font-size:14px;vertical-align:top`;
const HEAD = `${CELL};color:${c.textMuted};font-size:12px;text-align:left;font-weight:600`;
const TABLE = `border:1px solid ${c.border};margin:0 0 16px;border-collapse:separate`;

/** escapeHtml plus braces, so reader text can never look like a placeholder. */
export function escaparLector(value: string): string {
  return escapeHtml(value).replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
}

type Submission = { magnetSlug: string; payload: Record<string, unknown> };

/**
 * «Prioridad de procesos». On screen the reader saw the ranking. The email
 * adds what the page does not have: their ranking kept in writing with every
 * score, and a measurement sheet for their top process — the article's «mide
 * antes de construir» turned into a log to fill in for ten working days,
 * named after their process, with the cost formula to close it.
 */
export function prioridadProcesos(payload: Record<string, unknown>): string | null {
  const entrada = parseProcesos(payload.inputs);
  if (!entrada) return null;
  const resultado = computeProcesos(entrada);
  const shown = formatoProcesos(resultado);
  const top = resultado.puestos[0];
  if (!top) return null;
  const nombreTop = escaparLector(top.nombre);

  const cabecera =
    `<tr><td style="${HEAD}">Puesto</td><td style="${HEAD}">Proceso</td>` +
    CRITERIOS_PROCESOS.map((k) => `<td style="${HEAD};text-align:center">${escapeHtml(k.corto)}</td>`).join("") +
    `<td style="${HEAD};text-align:right">Total</td></tr>`;

  const filas = resultado.puestos
    .map((p, i) => {
      const f = shown.filas[i];
      const fuerte = p.puesto === 1;
      return (
        `<tr><td style="${CELL};color:${c.textMuted};white-space:nowrap">${escapeHtml(f.puesto)}</td>` +
        `<td style="${CELL};color:${c.textMain};font-weight:${fuerte ? 700 : 400}">${escaparLector(p.nombre)}` +
        (p.aviso ? `<br><span style="color:${c.textMuted};font-size:12px">${escapeHtml(p.aviso)}</span>` : "") +
        `</td>` +
        p.notas.map((n) => `<td style="${CELL};text-align:center;color:${c.textMain}">${n}</td>`).join("") +
        `<td style="${CELL};text-align:right;white-space:nowrap;font-weight:${fuerte ? 700 : 400};` +
        `color:${fuerte ? c.accent : c.textMain}">${escapeHtml(f.total)}</td></tr>`
      );
    })
    .join("");

  const medir = [
    ["Casos que entran", "Cuenta cada caso el día que llega."],
    ["Minutos por caso", "Mide tres o cuatro casos con reloj, no de memoria."],
    ["Correcciones", "Casos que hubo que rehacer o corregir después."],
    ["Interrupciones", "Veces que el proceso se paró por falta de un dato."],
  ];

  const hojaCab =
    `<tr><td style="${HEAD}">Día</td>` +
    medir.map(([t]) => `<td style="${HEAD}">${escapeHtml(t)}</td>`).join("") +
    `</tr>`;
  const hojaFilas = Array.from({ length: 10 }, (_, i) =>
    `<tr><td style="${CELL};color:${c.textMuted}">${i + 1}</td>` +
    medir.map(() => `<td style="${CELL}">&nbsp;</td>`).join("") +
    `</tr>`,
  ).join("");

  return (
    `<p style="${P}">Este es el orden que te salió, con tus notas, para que lo tengas por escrito:</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="${TABLE}">` +
    cabecera +
    filas +
    `</table>` +
    `<p style="${P};color:${c.textMuted};font-size:13px">Cada criterio va del 1 al 5, y en los cinco ` +
    `el 5 es el caso más favorable. En empate gana el que tiene el riesgo más controlable: coste del ` +
    `error más revisión.</p>` +
    `<p style="${P}"><strong>La hoja para medir «${nombreTop}» antes de construir nada.</strong> ` +
    `Diez días laborables normales, una fila por día. Al final tienes la línea base con la que ` +
    `comparar cualquier cambio:</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="${TABLE}">` +
    hojaCab +
    hojaFilas +
    `</table>` +
    `<p style="${P}">Apunta también, una sola vez: cuánto cuesta una hora de la persona que lo hace, ` +
    `y qué resultado das por aceptable. Con eso, la cuenta del trabajo manual es:</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" ` +
    `style="background-color:${c.bg};margin:0 0 16px">` +
    `<tr><td style="padding:14px 16px;font-family:monospace;font-size:13px;line-height:1.7;color:${c.textMain}">` +
    `coste = casos × minutos por caso ÷ 60 × coste por hora` +
    `</td></tr></table>` +
    `<p style="${P};color:${c.textMuted};font-size:13px">Es una estimación del coste de hacerlo a mano, ` +
    `no un ahorro prometido. Si las correcciones o las interrupciones salen altas, eso también es un ` +
    `resultado: dice qué arreglar antes de automatizar.</p>`
  );
}

/**
 * The block for a piece submission, or null when the slug is not a piece with
 * an email, or its stored inputs no longer parse.
 */
export function bloquePieza(submission: Submission | null): string | null {
  if (!submission || !esPiezaConEmail(submission.magnetSlug)) return null;
  switch (submission.magnetSlug) {
    case "prioridad-procesos":
      return prioridadProcesos(submission.payload);
  }
}
