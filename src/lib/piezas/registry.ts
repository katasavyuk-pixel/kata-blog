/**
 * The models behind the interactive pieces, one per id.
 *
 * Same contract as src/lib/cost-model.ts, generalised: no `"use client"`, no
 * server imports, so the piece in the browser and the route handler that
 * stores what the reader produced run the very same arithmetic. MDX cannot
 * pass functions to a client component (MDXContent is a Server Component), so
 * a piece receives a string id and resolves its model here.
 *
 * Each model has:
 * - `campos`  what the reader fills in (criteria, checks or numeric fields);
 * - `ejemplo` the default state, rendered on the server and labelled «Ejemplo»
 *   wherever it is shown. No external figure lives in a model: every number is
 *   either the reader's or the article's own declared example;
 * - `parse`   untrusted input → validated input, or null. Bounds mirror the UI,
 *   so a payload that could not have come from the piece is rejected;
 * - `compute` validated input → result. Pure;
 * - `formato` result → the strings the piece and the email both print.
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Longest process name a reader can type. Also the server's cut-off. */
export const NOMBRE_MAX = 60;

/**
 * Spanish number formatting, by hand on purpose: `Intl` in es-ES does not
 * group four-digit numbers (5280, not 5.280), and server and browser ICU can
 * disagree, which would be a hydration mismatch in the one place the reader is
 * comparing numbers.
 */
export function formatoNumero(valor: number, decimales = 0): string {
  const negativo = valor < 0;
  const fijo = Math.abs(valor).toFixed(decimales);
  const [entero, fraccion] = fijo.split(".");
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const limpio = fraccion && /[1-9]/.test(fraccion) ? `${agrupado},${fraccion.replace(/0+$/, "")}` : agrupado;
  return negativo ? `-${limpio}` : limpio;
}

function esEntero(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

/** Collapse whitespace, strip control characters, cut to `max`. */
export function limpiarTexto(v: unknown, max = NOMBRE_MAX): string | null {
  if (typeof v !== "string") return null;
  const limpio = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return limpio.slice(0, max);
}

// ---------------------------------------------------------------------------
// 1. Puntuador (matriz): «¿Qué proceso automatizar primero?»
// ---------------------------------------------------------------------------

export type Criterio = {
  id: string;
  /** Column header. */
  corto: string;
  /** The question, as the article words it. */
  pregunta: string;
  /** What 1 and 5 mean, so every criterion points the same way: 5 = better first candidate. */
  uno: string;
  cinco: string;
};

/**
 * The five criteria of que-proceso-automatizar-primero.mdx, in its order.
 * «Coste del error» and «Revisión» are scored so that 5 is the safer case:
 * a higher total always means a better first candidate.
 */
export const CRITERIOS_PROCESOS: readonly Criterio[] = [
  {
    id: "frecuencia",
    corto: "Frecuencia",
    pregunta: "¿Cuántas veces aparece en un periodo normal?",
    uno: "casi nunca",
    cinco: "a diario",
  },
  {
    id: "tiempo",
    corto: "Tiempo",
    pregunta: "¿Cuántos minutos consume cada caso?",
    uno: "un momento",
    cinco: "mucho rato",
  },
  {
    id: "repeticion",
    corto: "Repetición",
    pregunta: "¿Se parece un caso al siguiente?",
    uno: "cada uno distinto",
    cinco: "todos iguales",
  },
  {
    id: "error",
    corto: "Coste del error",
    pregunta: "¿Qué ocurre si el resultado necesita corrección?",
    uno: "sale caro",
    cinco: "se corrige sin más",
  },
  {
    id: "revision",
    corto: "Revisión",
    pregunta: "¿Puede una persona validar las excepciones?",
    uno: "nadie puede",
    cinco: "es fácil",
  },
] as const;

export const NOTA_MIN = 1;
export const NOTA_MAX = 5;
export const FILAS_MIN = 1;
export const FILAS_MAX = 6;

export type FilaProceso = { nombre: string; notas: number[] };
export type EntradaProcesos = { filas: FilaProceso[] };

export type PuestoProceso = {
  /** Index in the reader's list, so the UI can point back to the row. */
  indice: number;
  nombre: string;
  notas: number[];
  total: number;
  /** Coste del error + Revisión: how controllable the risk is. The tie-break. */
  riesgo: number;
  /** 1-based, shared on a full tie (competition ranking: 1, 1, 3). */
  puesto: number;
  empate: boolean;
  /** The article's warning: a weak review or an expensive error. */
  aviso: string | null;
};

export type ResultadoProcesos = { puestos: PuestoProceso[]; maximo: number };

const I_ERROR = 3;
const I_REVISION = 4;

/** What the reader sees when a row has no name yet. Same on both sides. */
export function nombreDeFila(nombre: string, indice: number): string {
  return nombre.trim() || `Proceso ${indice + 1}`;
}

/**
 * Labelled «Ejemplo» wherever it renders. The three processes come from the
 * article's own list of good first candidates; the scores are illustrative.
 */
export const EJEMPLO_PROCESOS: EntradaProcesos = {
  filas: [
    { nombre: "Resumir reuniones en tareas", notas: [3, 3, 3, 4, 5] },
    { nombre: "Clasificar solicitudes entrantes", notas: [5, 2, 4, 4, 4] },
    { nombre: "Preparar el informe mensual", notas: [1, 5, 5, 3, 4] },
  ],
};

export function parseProcesos(value: unknown): EntradaProcesos | null {
  if (typeof value !== "object" || value === null) return null;
  const filas = (value as { filas?: unknown }).filas;
  if (!Array.isArray(filas) || filas.length < FILAS_MIN || filas.length > FILAS_MAX) return null;

  const out: FilaProceso[] = [];
  for (const raw of filas) {
    if (typeof raw !== "object" || raw === null) return null;
    const { nombre, notas } = raw as { nombre?: unknown; notas?: unknown };
    const limpio = limpiarTexto(nombre ?? "");
    if (limpio === null) return null;
    if (!Array.isArray(notas) || notas.length !== CRITERIOS_PROCESOS.length) return null;
    if (!notas.every((n) => esEntero(n, NOTA_MIN, NOTA_MAX))) return null;
    out.push({ nombre: limpio, notas: [...notas] as number[] });
  }
  return { filas: out };
}

function avisoDe(notas: number[]): string | null {
  if (notas[I_ERROR] <= 2 && notas[I_REVISION] <= 2) {
    return "Error caro y difícil de revisar: necesita una política y un dueño antes que una automatización.";
  }
  if (notas[I_ERROR] <= 2) return "Si sale mal, sale caro: empieza con revisión humana de cada caso.";
  if (notas[I_REVISION] <= 2) return "Nadie puede validar las excepciones: primero define quién revisa.";
  return null;
}

/**
 * Rank by total (desc). On equal totals, the one whose risk is easier to
 * control (Coste del error + Revisión) goes first — the article's own
 * criterion: frequency and repetition «con un coste de error que puedas
 * controlar». If that is equal too, they share the position and both say so.
 * The reader's order decides who is listed first among true ties.
 */
export function computeProcesos(entrada: EntradaProcesos): ResultadoProcesos {
  const filas = entrada.filas.map((fila, indice) => {
    const total = fila.notas.reduce((a, b) => a + b, 0);
    const riesgo = fila.notas[I_ERROR] + fila.notas[I_REVISION];
    return { indice, nombre: nombreDeFila(fila.nombre, indice), notas: fila.notas, total, riesgo };
  });

  const ordenadas = [...filas].sort(
    (a, b) => b.total - a.total || b.riesgo - a.riesgo || a.indice - b.indice,
  );

  const puestos: PuestoProceso[] = [];
  ordenadas.forEach((fila, i) => {
    const previa = puestos[i - 1];
    const iguales = previa && previa.total === fila.total && previa.riesgo === fila.riesgo;
    puestos.push({
      ...fila,
      puesto: iguales ? previa.puesto : i + 1,
      empate: false,
      aviso: avisoDe(fila.notas),
    });
  });
  for (const p of puestos) {
    p.empate = puestos.filter((q) => q.puesto === p.puesto).length > 1;
  }

  return { puestos, maximo: CRITERIOS_PROCESOS.length * NOTA_MAX };
}

export function formatoProcesos(resultado: ResultadoProcesos) {
  const primeros = resultado.puestos.filter((p) => p.puesto === 1);
  const cabeza = primeros[0];
  let veredicto: string;
  if (!cabeza) {
    veredicto = "Añade un proceso para ver el orden.";
  } else if (primeros.length > 1) {
    veredicto = `Empate arriba: ${primeros.map((p) => `«${p.nombre}»`).join(" y ")} suman ${cabeza.total} de ${resultado.maximo} y controlan el riesgo igual. Decide quién lo puede revisar mejor.`;
  } else {
    veredicto = `Empieza por «${cabeza.nombre}»: suma ${cabeza.total} de ${resultado.maximo}.`;
  }
  return {
    veredicto,
    filas: resultado.puestos.map((p) => ({
      puesto: p.empate ? `${p.puesto}.º =` : `${p.puesto}.º`,
      nombre: p.nombre,
      total: `${p.total} / ${resultado.maximo}`,
      aviso: p.aviso,
    })),
  };
}

// ---------------------------------------------------------------------------
// 2. Puntuador (lista): las 9 comprobaciones GEO
// ---------------------------------------------------------------------------

export type Comprobacion = { id: string; titulo: string; porque: string };

/**
 * The nine checks of lead-magnets/maitreai-geo/zip/comprobaciones-geo.md, in
 * its order. Titles and one-line reasons only: the commands and what came out
 * in my case stay in the ZIP, which is what the email delivers.
 */
export const COMPROBACIONES_GEO: readonly Comprobacion[] = [
  { id: "200", titulo: "Cada URL pública responde 200 y no redirige", porque: "Lo que un rastreador no llega a leer no lo puede citar." },
  { id: "canonical", titulo: "Cada página declara su propia dirección canónica", porque: "Si nueve páginas dicen ser la portada, ocho dejan de existir." },
  { id: "robots", titulo: "robots.txt no bloquea a los rastreadores de IA y sigue protegiendo lo privado", porque: "Un bot con apartado propio ignora el general por completo." },
  { id: "marca", titulo: "Un solo nombre de marca, bajo un solo identificador", porque: "Tres grafías para la misma entidad son tres respuestas distintas." },
  { id: "datos", titulo: "Ninguna página pública se queda sin datos estructurados", porque: "Es rellenarle la ficha a la máquina en vez de que adivine." },
  { id: "marcado", titulo: "El marcado no miente", porque: "Declarar preguntas que no se ven en la página es contenido engañoso." },
  { id: "html", titulo: "El contenido llega en el HTML, sin ejecutar JavaScript", porque: "Muchos rastreadores no ejecutan tu JavaScript." },
  { id: "h1", titulo: "Cada página tiene un H1 propio y distinto", porque: "Ocho H1 iguales son, para una máquina, ocho copias de una página." },
  { id: "dominio", titulo: "Todas las entradas a tu dominio acaban en el mismo sitio, con certificado válido", porque: "Si www no resuelve, quien entra por ahí se queda fuera." },
] as const;

/** The first three break everything else if they are wrong (the ZIP's own rule). */
export const FUNDAMENTOS_GEO = 3;

export type EntradaLista = { hechas: number[] };

/** «Ejemplo»: a site that has only looked at robots.txt and its H1s. */
export const EJEMPLO_GEO: EntradaLista = { hechas: [2, 7] };

export function parseLista(value: unknown, total = COMPROBACIONES_GEO.length): EntradaLista | null {
  if (typeof value !== "object" || value === null) return null;
  const hechas = (value as { hechas?: unknown }).hechas;
  if (!Array.isArray(hechas) || hechas.length > total) return null;
  if (!hechas.every((i) => esEntero(i, 0, total - 1))) return null;
  if (new Set(hechas).size !== hechas.length) return null;
  return { hechas: [...(hechas as number[])].sort((a, b) => a - b) };
}

export type ResultadoLista = {
  hechas: number;
  total: number;
  /** Index of the next check to do, in the list's order, or null when all are done. */
  siguiente: number | null;
  fundamentosPendientes: number;
};

export function computeLista(entrada: EntradaLista, total = COMPROBACIONES_GEO.length): ResultadoLista {
  const hechas = new Set(entrada.hechas);
  let siguiente: number | null = null;
  for (let i = 0; i < total; i++) {
    if (!hechas.has(i)) {
      siguiente = i;
      break;
    }
  }
  let fundamentosPendientes = 0;
  for (let i = 0; i < Math.min(FUNDAMENTOS_GEO, total); i++) if (!hechas.has(i)) fundamentosPendientes++;
  return { hechas: hechas.size, total, siguiente, fundamentosPendientes };
}

export function formatoLista(resultado: ResultadoLista, items: readonly Comprobacion[] = COMPROBACIONES_GEO) {
  const cuenta = `${resultado.hechas} de ${resultado.total}`;
  let veredicto: string;
  if (resultado.siguiente === null) {
    veredicto = "Las nueve en orden. Ahora toca esperar: un asistente no relee internet cada minuto.";
  } else {
    const n = resultado.siguiente + 1;
    const base = `Siguiente: la ${n}, «${items[resultado.siguiente].titulo}».`;
    veredicto =
      resultado.fundamentosPendientes > 0
        ? `${base} Las tres primeras van antes que todo lo demás: si fallan, el resto no se llega a leer.`
        : base;
  }
  return { cuenta, veredicto };
}

// ---------------------------------------------------------------------------
// 3. Calculadora: coste manual de la entrada de documentos
// ---------------------------------------------------------------------------

export type Campo = {
  id: string;
  etiqueta: string;
  ayuda: string;
  min: number;
  max: number;
  paso: number;
  unidad: string;
};

/**
 * antes-del-tms-tu-inbox.mdx: «coste manual mensual = documentos al mes ×
 * minutos por documento ÷ 60 × coste por hora». The defaults are the
 * article's illustrative example (30 a day, 22 working days, 8 minutes,
 * 20 €/hour), labelled as such wherever they render.
 */
export const CAMPOS_INBOX: readonly Campo[] = [
  { id: "docsDia", etiqueta: "Documentos al día", ayuda: "Correos o PDF que alguien teclea a mano.", min: 1, max: 2000, paso: 1, unidad: "" },
  { id: "dias", etiqueta: "Días laborables al mes", ayuda: "Los que de verdad se trabaja esa entrada.", min: 1, max: 31, paso: 1, unidad: "" },
  { id: "minutos", etiqueta: "Minutos por documento", ayuda: "Abrir, leer, copiar y corregir.", min: 1, max: 120, paso: 1, unidad: "min" },
  { id: "eurosHora", etiqueta: "Coste por hora", ayuda: "El que usas para medir esa carga.", min: 1, max: 200, paso: 1, unidad: "€" },
] as const;

export type EntradaInbox = { docsDia: number; dias: number; minutos: number; eurosHora: number };

export const EJEMPLO_INBOX: EntradaInbox = { docsDia: 30, dias: 22, minutos: 8, eurosHora: 20 };

export function parseInbox(value: unknown): EntradaInbox | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const campo of CAMPOS_INBOX) {
    const v = raw[campo.id];
    if (!esEntero(v, campo.min, campo.max)) return null;
    out[campo.id] = v;
  }
  return out as EntradaInbox;
}

export type ResultadoInbox = { docsMes: number; minutosMes: number; horasMes: number; costeMes: number };

export function computeInbox(e: EntradaInbox): ResultadoInbox {
  const docsMes = e.docsDia * e.dias;
  const minutosMes = docsMes * e.minutos;
  const horasMes = minutosMes / 60;
  const costeMes = horasMes * e.eurosHora;
  return { docsMes, minutosMes, horasMes, costeMes };
}

export function formatoInbox(r: ResultadoInbox, e: EntradaInbox) {
  return {
    docsMes: formatoNumero(r.docsMes),
    minutosMes: formatoNumero(r.minutosMes),
    horasMes: formatoNumero(r.horasMes, 1),
    costeMes: `${formatoNumero(r.costeMes)} €`,
    formula: `${formatoNumero(r.docsMes)} × ${formatoNumero(e.minutos)} ÷ 60 × ${formatoNumero(e.eurosHora)} € = ${formatoNumero(r.costeMes)} €`,
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const PIEZAS = {
  "prioridad-procesos": {
    tipo: "matriz",
    campos: CRITERIOS_PROCESOS,
    ejemplo: EJEMPLO_PROCESOS,
    parse: parseProcesos,
    compute: computeProcesos,
    formato: formatoProcesos,
  },
  "comprobaciones-geo": {
    tipo: "lista",
    campos: COMPROBACIONES_GEO,
    ejemplo: EJEMPLO_GEO,
    parse: (v: unknown) => parseLista(v),
    compute: (e: EntradaLista) => computeLista(e),
    formato: (r: ResultadoLista) => formatoLista(r),
  },
  "coste-entrada-manual": {
    tipo: "calculo",
    campos: CAMPOS_INBOX,
    ejemplo: EJEMPLO_INBOX,
    parse: parseInbox,
    compute: computeInbox,
    formato: formatoInbox,
  },
} as const;

export type PiezaId = keyof typeof PIEZAS;

export function esPiezaId(id: string): id is PiezaId {
  return Object.prototype.hasOwnProperty.call(PIEZAS, id);
}

/**
 * Piece ids that send something by email after the piece. Only these may be a
 * `magnetSlug` on /api/subscribe; the other pieces hand over an existing
 * resource through the article's own form, which needs no payload.
 */
export const PIEZAS_CON_EMAIL = ["prioridad-procesos"] as const satisfies readonly PiezaId[];
export type PiezaConEmail = (typeof PIEZAS_CON_EMAIL)[number];

export function esPiezaConEmail(slug: string): slug is PiezaConEmail {
  return (PIEZAS_CON_EMAIL as readonly string[]).includes(slug);
}
