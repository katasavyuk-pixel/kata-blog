/**
 * Evidence — credibility badges that are derived and checked, not typed by hand.
 *
 * ESTRATEGIA.md already fixes the editorial rule: every important claim rests on
 * a real screen, a reproducible test, or lived experience marked as such. This
 * encodes that rule as a type, so the site cannot claim something is "en
 * producción" without saying where, or announce a system "en el taller" without
 * a date it is answerable to.
 *
 * The invariants below throw at module load, which means `next build` fails.
 * That is deliberate: a promise the site can no longer keep should stop a
 * deploy, not decay quietly on the homepage the way the last two did.
 */

export type Evidencia =
  /** Something running that a reader can go and look at. */
  | { tipo: "en-produccion"; url: string; desde: string }
  /** Code or a path a reader can run themselves. */
  | { tipo: "reproducible"; ruta: string }
  /** A number, and where it came from. Never a number on its own. */
  | { tipo: "medido"; dato: string; fuente: string }
  /** Own experience, explicitly marked as own experience. */
  | { tipo: "experiencia"; nota: string }
  /** Announced work. `eta` is mandatory — see assertEvidencia. */
  | { tipo: "en-taller"; eta: string; progreso?: number };

/**
 * What a system costs per month, on its ficha. Either a measured figure with
 * its source and the day it was checked, or the reason there is no figure.
 * A measured value without `fuente` or `comprobado` fails the build, the same
 * way a "medido" evidence does: a number on its own is not published.
 */
export type CosteMensual =
  | { medido: true; valor: string; fuente: string; comprobado: string /* ISO date */ }
  | { medido: false; motivo: string };

/** `comprobado` is a day: "2026-10-07". A cost checked "some month" is not checked. */
const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Throws when a measured monthly cost lacks its source or its check date. */
export function assertCosteMensual(where: string, coste: CosteMensual): void {
  const fail = (why: string) => {
    throw new Error(`Coste mensual inválido en "${where}": ${why}`);
  };
  if (!coste.medido) {
    if (!coste.motivo.trim()) {
      fail("sin cifra hace falta el motivo (por qué no hay dato todavía).");
    }
    return;
  }
  if (!coste.valor.trim()) fail("`medido: true` sin valor.");
  if (!coste.fuente.trim()) {
    fail(`el valor "${coste.valor}" no tiene fuente. Una cifra sin origen no se publica.`);
  }
  if (!ISO_DATE_PATTERN.test(coste.comprobado)) {
    fail(
      `\`comprobado\` tiene que ser una fecha YYYY-MM-DD (recibido: "${coste.comprobado}"). ` +
        "Un coste que no se sabe cuándo se miró no está medido.",
    );
  }
}

/**
 * An installable asset of the catalogue (a skill, an agent, a template): what
 * its page states and therefore what has to be true.
 *
 * Someone is going to put this into the tool they run their business with, so
 * the ficha answers the questions a careful person asks before installing
 * anything: who it is for, what it needs, what it reads and writes, whether
 * anything leaves the machine, which version this describes and under what
 * licence. None of those can be left blank — an asset page with an empty
 * permissions row is the one that should not be trusted.
 */
export type Activo = {
  tipo: "skill" | "agente" | "plantilla";
  /** The <title> of its page: the words someone types to find it. Max 60. */
  tituloBusqueda: string;
  /** Version this ficha describes, `major.minor.patch`. */
  version: string;
  /** Day that version was published, YYYY-MM-DD. */
  publicado: string;
  /** Path of the asset inside the catalogue repository (config/catalogo.ts). */
  ruta: string;
  /** SPDX identifier. */
  licencia: string;
  paraQuien: string;
  noEsPara: string;
  requisitos: string[];
  /** What it reads when it runs. */
  lee: string[];
  /** What it creates or changes. Empty only if it truly writes nothing. */
  escribe: string[];
  /** What leaves the machine by the asset's own doing. */
  red: string;
  /** How it has been tested — or, plainly, that it has not. */
  pruebas: string;
};

const LICENCIAS_SPDX = ["MIT", "Apache-2.0", "BSD-3-Clause", "CC-BY-4.0"];
export const TITULO_BUSQUEDA_MAX = 60;

/** Throws when an asset's ficha leaves out something a reader installs it on. */
export function assertActivo(where: string, activo: Activo): void {
  const fail = (why: string) => {
    throw new Error(`Activo inválido en "${where}": ${why}`);
  };
  const vacio = (texto: string) => !texto.trim();

  if (vacio(activo.tituloBusqueda) || activo.tituloBusqueda.length > TITULO_BUSQUEDA_MAX) {
    fail(`\`tituloBusqueda\` tiene que existir y caber en ${TITULO_BUSQUEDA_MAX} caracteres (tiene ${activo.tituloBusqueda.length}).`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(activo.version)) {
    fail(`la versión "${activo.version}" no es major.minor.patch.`);
  }
  if (!ISO_DATE_PATTERN.test(activo.publicado)) {
    fail(`\`publicado\` tiene que ser una fecha YYYY-MM-DD (recibido: "${activo.publicado}").`);
  }
  if (vacio(activo.ruta) || activo.ruta.startsWith("/") || activo.ruta.includes("..")) {
    fail(`la ruta "${activo.ruta}" tiene que ser relativa al repositorio del catálogo.`);
  }
  if (!LICENCIAS_SPDX.includes(activo.licencia)) {
    fail(`la licencia "${activo.licencia}" no es uno de los identificadores SPDX admitidos (${LICENCIAS_SPDX.join(", ")}).`);
  }
  if (vacio(activo.paraQuien) || vacio(activo.noEsPara)) {
    fail("faltan `paraQuien` o `noEsPara`: una ficha dice también a quién no le sirve.");
  }
  if (activo.requisitos.length === 0 || activo.requisitos.some(vacio)) {
    fail("sin requisitos. Si no necesita nada más que el propio agente, se dice eso.");
  }
  if (activo.lee.length === 0 || activo.lee.some(vacio) || activo.escribe.some(vacio)) {
    fail("la fila de permisos está vacía: qué lee y qué escribe es lo primero que mira quien instala algo.");
  }
  if (vacio(activo.red)) {
    fail("falta `red`: qué sale del equipo por su cuenta, aunque la respuesta sea «nada».");
  }
  if (vacio(activo.pruebas)) {
    fail("falta `pruebas`. «Sin pruebas automáticas» es una respuesta válida; el hueco, no.");
  }
}

/** ETA granularity is a month: "2026-09". Day-level dates would be fiction. */
const ETA_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Sortable current month, e.g. "2026-08". */
function currentMonth(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Throws if the evidence does not back the claim it makes.
 *
 * `where` names the offending item so the build error points at the fix rather
 * than at this file.
 */
export function assertEvidencia(where: string, evidencia: Evidencia, now = new Date()): void {
  const fail = (why: string) => {
    throw new Error(`Evidencia inválida en "${where}": ${why}`);
  };

  switch (evidencia.tipo) {
    case "en-produccion":
      if (!evidencia.url.trim()) {
        fail('"en-produccion" necesita una url que el lector pueda abrir.');
      }
      if (!evidencia.desde.trim()) {
        fail('"en-produccion" necesita `desde` (desde cuándo lleva funcionando).');
      }
      break;

    case "reproducible":
      if (!evidencia.ruta.trim()) {
        fail('"reproducible" necesita la ruta del código que se puede correr.');
      }
      break;

    case "medido":
      // The one rule VOZ.md states twice: never publish a number you cannot source.
      if (!evidencia.fuente.trim()) {
        fail(`"medido" declara el dato "${evidencia.dato}" sin fuente. Una cifra sin origen no se publica.`);
      }
      break;

    case "experiencia":
      if (!evidencia.nota.trim()) {
        fail('"experiencia" necesita la nota que la marca como experiencia propia.');
      }
      break;

    case "en-taller": {
      if (!ETA_PATTERN.test(evidencia.eta)) {
        fail(
          `"en-taller" necesita una ETA con formato YYYY-MM (recibido: "${evidencia.eta}"). ` +
            "Anunciar algo sin fecha es la promesa abierta que este invariante existe para impedir.",
        );
      }
      if (evidencia.eta < currentMonth(now)) {
        fail(
          `la ETA ${evidencia.eta} ya venció. Publícalo, o mueve la fecha a un mes que puedas sostener. ` +
            "Se prefiere romper la build a dejar en la home una promesa caducada.",
        );
      }
      if (evidencia.progreso !== undefined && (evidencia.progreso < 0 || evidencia.progreso > 100)) {
        fail(`progreso fuera de rango: ${evidencia.progreso}.`);
      }
      break;
    }
  }
}

/**
 * Short badge text — the claim only.
 *
 * The source is deliberately not concatenated here: a card badge reading
 * "8 lecciones · src/config/course.ts" helps nobody. Requiring the source and
 * displaying it are separate jobs — the type enforces that it exists, and the
 * article-level evidence block is where it gets shown.
 */
export function evidenciaLabel(evidencia: Evidencia): string {
  switch (evidencia.tipo) {
    case "en-produccion":
      return `en producción desde ${evidencia.desde}`;
    case "reproducible":
      return "reproducible · código publicado";
    case "medido":
      return evidencia.dato;
    case "experiencia":
      return evidencia.nota;
    case "en-taller":
      return `en el taller · ETA ${evidencia.eta}`;
  }
}

/** Where the claim can be checked, for the article-level evidence block. */
export function evidenciaFuente(evidencia: Evidencia): string | null {
  switch (evidencia.tipo) {
    case "en-produccion":
      return evidencia.url;
    case "reproducible":
      return evidencia.ruta;
    case "medido":
      return evidencia.fuente;
    case "experiencia":
    case "en-taller":
      return null;
  }
}
