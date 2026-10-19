import type { TipoEntrada, Proyecto } from "@/config/bitacora";
import { conUtm } from "@/lib/correo";
import type { Novedad } from "@/lib/novedades";

/**
 * The weekly edition: what a person signs out of a week of automated news.
 *
 * The daily edition is a reading service written by a model and published with
 * nobody in between. The weekly one is the opposite end: a person reads the
 * week, keeps what matters, says why in their own words and sends it. This
 * module only prepares that work. It gathers the week's verified items, picks a
 * short list by rules anyone can read, and writes a draft whose every sentence
 * of opinion is a `{{block}}` the editor has to replace: `pendientes` finds
 * those blocks and the send refuses to go out while one is left.
 *
 * Pure: no files, no clock. scripts/radar/weekly-draft.ts does the reading and
 * the writing; tests/semanal.test.ts runs these functions directly.
 */

const DIA = 24 * 60 * 60 * 1000;

/**
 * How many news items the draft proposes: the one that matters, with its
 * picture and a sentence of the editor's, and four more under it. A weekly
 * email is not an archive (2026-10-15, «N2»: short and visual).
 */
export const MAX_NOTICIAS = 5;
/** At most this many entries of the build log: the latest ones. */
export const MAX_CONSTRUIDO = 3;
/** At most this many per axis, so one busy beat cannot fill the edition. */
export const MAX_POR_EJE = 2;
/** At most this many of the week's lead articles. */
export const MAX_PROTAGONISTAS = 3;

/** The heading the news go under. The monthly page finds the section by it. */
export const TITULO_NOTICIAS = "Lo que ha pasado";
/**
 * The heading of the editor's own text: the one thing that matters this week,
 * theirs or the world's (2026-10-16). The email and the archive draw the
 * `importante` card around it; the monthly page leads the week with it.
 */
export const TITULO_IMPORTANTE = "Lo importante de esta semana";

export type Semana = { desde: string; hasta: string };

const aFecha = (iso: string): Date => {
  const fecha = new Date(`${iso}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(+fecha)) {
    throw new Error(`«${iso}» no es una fecha AAAA-MM-DD.`);
  }
  return fecha;
};

/** The seven days that end on `hasta`, both ends included. */
export function semanaHasta(hasta: string): Semana {
  return { desde: new Date(+aFecha(hasta) - 6 * DIA).toISOString().slice(0, 10), hasta };
}

export const enSemana = (fecha: string, semana: Semana): boolean =>
  fecha.slice(0, 10) >= semana.desde && fecha.slice(0, 10) <= semana.hasta;

/**
 * `2026-s42`: the ISO year and week of the last day. It is the issue's id, the
 * idempotency key of the send, so the same week always gets the same one.
 */
export function idDeSemana(hasta: string): string {
  const dia = aFecha(hasta);
  // ISO 8601: the week belongs to the year its Thursday falls in.
  const jueves = new Date(+dia + (4 - (dia.getUTCDay() || 7)) * DIA);
  const primero = Date.UTC(jueves.getUTCFullYear(), 0, 1);
  const semana = Math.ceil(((+jueves - primero) / DIA + 1) / 7);
  return `${jueves.getUTCFullYear()}-s${String(semana).padStart(2, "0")}`;
}

/** "del 12 al 18 de octubre", or "del 28 de septiembre al 4 de octubre". */
export function rangoLegible({ desde, hasta }: Semana): string {
  const mes = (iso: string) => aFecha(iso).toLocaleDateString("es-ES", { month: "long", timeZone: "UTC" });
  const dia = (iso: string) => String(aFecha(iso).getUTCDate());
  return mes(desde) === mes(hasta)
    ? `del ${dia(desde)} al ${dia(hasta)} de ${mes(hasta)}`
    : `del ${dia(desde)} de ${mes(desde)} al ${dia(hasta)} de ${mes(hasta)}`;
}

export type NoticiaSemanal = {
  fecha: string;
  /** Axis key of the source; lead articles carry none. */
  eje?: string;
  medio: string;
  /** Where the reader is sent: the source, or the article on this site. */
  url: string;
  /** What the reader reads. */
  titular: string;
  /** False when all there is is the source's own headline, in its language. */
  enEspanol: boolean;
  resumen: string;
  /** A lead article: the day's story, with a full piece on this site. */
  protagonista: boolean;
  /** The lead article's cover, for the news that matters. */
  imagen?: Imagen;
};

export type Imagen = { src: string; alt: string };

export type EdicionDeLaSemana = { date: string; novedades: Novedad[] };
export type ProtagonistaDeLaSemana = {
  date: string;
  title: string;
  description: string;
  permalink: string;
  medio: string;
  fuenteUrl?: string;
  imagen?: Imagen;
};

/**
 * Every item of the week, once. Lead articles first (newest first), then each
 * edition newest first, in the order the edition gave them. An item that
 * appears on two days, or that is also a lead article, counts the first time.
 *
 * `medioDe` turns a feed's label into the outlet's name ("TechCrunch AI" is the
 * feed; the outlet a person would name is "TechCrunch").
 */
export function reunir(
  semana: Semana,
  ediciones: readonly EdicionDeLaSemana[],
  protagonistas: readonly ProtagonistaDeLaSemana[],
  medioDe: (fuente: string) => string = (fuente) => fuente,
): NoticiaSemanal[] {
  const porFecha = <T extends { date: string }>(lista: readonly T[]) =>
    lista.filter((x) => enSemana(x.date, semana)).sort((a, b) => b.date.localeCompare(a.date));

  const vistas = new Set<string>();
  const noticias: NoticiaSemanal[] = [];

  for (const articulo of porFecha(protagonistas)) {
    if (articulo.fuenteUrl) vistas.add(articulo.fuenteUrl);
    noticias.push({
      fecha: articulo.date.slice(0, 10),
      medio: medioDe(articulo.medio),
      url: articulo.permalink,
      titular: articulo.title,
      enEspanol: true,
      resumen: articulo.description,
      protagonista: true,
      ...(articulo.imagen ? { imagen: articulo.imagen } : {}),
    });
  }
  for (const edicion of porFecha(ediciones)) {
    for (const novedad of edicion.novedades) {
      if (vistas.has(novedad.url)) continue;
      vistas.add(novedad.url);
      noticias.push({
        fecha: edicion.date.slice(0, 10),
        eje: novedad.axis,
        medio: medioDe(novedad.source),
        url: novedad.url,
        titular: novedad.titular ?? novedad.title,
        enEspanol: novedad.titular !== undefined,
        resumen: novedad.resumen,
        protagonista: false,
      });
    }
  }
  return noticias;
}

/**
 * The short list, by rules and not by taste: the newest lead articles, then the
 * rest in the order `reunir` gave them, never more than `MAX_POR_EJE` from one
 * axis. It is a proposal. Choosing is the editor's job, and the draft says how
 * many were left out.
 */
export function elegir(noticias: readonly NoticiaSemanal[]): NoticiaSemanal[] {
  const elegidas = noticias.filter((n) => n.protagonista).slice(0, MAX_PROTAGONISTAS);
  const porEje = new Map<string, number>();
  for (const noticia of noticias) {
    if (elegidas.length >= MAX_NOTICIAS) break;
    if (noticia.protagonista) continue;
    const eje = noticia.eje ?? "";
    if ((porEje.get(eje) ?? 0) >= MAX_POR_EJE) continue;
    porEje.set(eje, (porEje.get(eje) ?? 0) + 1);
    elegidas.push(noticia);
  }
  return elegidas;
}

/** Every `{{block}}` still to be written, also as Velite leaves it inside a link. */
export function pendientes(...textos: readonly string[]): string[] {
  return textos.flatMap((texto) => texto.match(/\{\{[\s\S]*?\}\}|%7B%7B[\s\S]*?%7D%7D/gi) ?? []);
}

/**
 * A weekly edition still in draft, told from the file itself. Until the editor
 * takes `draft: true` off, its headlines are other people's words (the source's,
 * or a model's): the checks on what this site says in its own voice start when
 * somebody signs it.
 */
export function esBorradorSemanal(fichero: string): boolean {
  const frontmatter = fichero.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  return /^tipo:\s*semanal\s*$/m.test(frontmatter) && /^draft:\s*true\s*$/m.test(frontmatter);
}

/** An entry of /bitacora as the weekly edition shows it: what I built, with its proof. */
export type Construido = {
  titulo: string;
  url: string;
  frase: string;
  /** AAAA-MM-DD. */
  fecha: string;
  tipo: TipoEntrada;
  proyecto: Proyecto;
  /** The cover of the piece it links to, when it links to one. */
  imagen?: Imagen;
};

/**
 * The headline on its own line, the summary under it. A backslash and not two
 * trailing spaces: the editor's text editor strips those on save.
 */
const SALTO = "\\\n";

/** A markdown link cannot hold a raw "]" in its text or ")" in its address. */
const texto = (s: string) => s.replace(/\s+/g, " ").trim().replace(/([\[\]])/g, "\\$1");
const enlace = (url: string) => url.replace(/\(/g, "%28").replace(/\)/g, "%29");
/** A YAML scalar: JSON's double quotes are valid YAML and escape everything that needs it. */
const yaml = (s: string) => JSON.stringify(s.replace(/\s+/g, " ").trim());
const imagenYaml = (imagen: Imagen, sangria: string) => [
  `${sangria}imagen:`,
  `${sangria}  src: ${yaml(imagen.src)}`,
  `${sangria}  alt: ${yaml(imagen.alt)}`,
];

/**
 * The draft, as the file that goes in content/newsletters/: «El parte» (N2),
 * the format Kata chose on 2026-10-15. Its blocks live in the frontmatter so
 * the email and the archive page can draw them (src/lib/edicion.ts).
 *
 * Since 2026-10-16 it is one email a week built around one thing: «Lo
 * importante de esta semana», Kata's or the world's. Its text is the body's
 * first section (`TITULO_IMPORTANTE`), written by the editor; the draft only
 * proposes the week's strongest news as its card (`importante`). Then what I
 * built (from /bitacora), the rest of the week in one line each under
 * `TITULO_NOTICIAS` (what the monthly page is made of), a skill, the question.
 *
 * What a model wrote (headlines) is laid out for review. What only the editor
 * can say (the subject line, the important thing, the question) is a `{{block}}`.
 */
export function borradorSemanal({
  semana,
  elegidas,
  total,
  construido = [],
  skill,
  siteUrl,
  generado,
}: {
  semana: Semana;
  elegidas: readonly NoticiaSemanal[];
  /** How many distinct items the week had, chosen or not. */
  total: number;
  /** What went into /bitacora during the week, newest first. */
  construido?: readonly Construido[];
  /** The marketplace skill to recommend, by id. */
  skill?: string;
  siteUrl: string;
  /** Day the draft was written, for the header. */
  generado: string;
}): string {
  const id = idDeSemana(semana.hasta);
  const rango = rangoLegible(semana);
  const enIngles = elegidas.filter((n) => !n.enEspanol).length;
  const propio = (ruta: string) => conUtm(ruta.startsWith("http") ? ruta : `${siteUrl}${ruta}`, id);
  const [destacada, ...resto] = elegidas;
  const obra = construido.slice(0, MAX_CONSTRUIDO);

  const cabecera = [
    `# BORRADOR de la edición semanal, escrito el ${generado} por scripts/radar/weekly-draft.ts.`,
    `# Semana ${rango}: ${total} noticias distintas en las ediciones diarias; aquí van ${elegidas.length}.`,
    ...(construido.length > obra.length
      ? [`# De la bitácora: ${construido.length} entradas esta semana; aquí van las ${obra.length} últimas.`]
      : []),
    "# No se envía solo: lleva `draft: true` y bloques {{…}} que solo puedes escribir tú.",
    "#",
    "# Antes de enviar, EL MISMO DÍA:",
    "#   [ ] Sustituye cada bloque {{…}}: mientras quede uno, el envío falla a propósito.",
    "#   [ ] Asunto: un emoji delante que diga qué hay dentro (🎁 regalo · 🛠️ algo montado · ⚠️ algo que se rompió · 📰 noticia).",
    "#   [ ] Lee cada titular contra su fuente (el enlace va al lado): los escribió un modelo.",
    "#       Lo que no dirías así, cámbialo; lo que no importe, quítalo.",
    ...(enIngles > 0
      ? [`#   [ ] ${enIngles} titular(es) siguen en el idioma de la fuente: tradúcelos o quítalos.`]
      : []),
    "#   [ ] Checklist de voz y límites (ninguna cifra sin fuente).",
    "#   [ ] Imágenes del correo: npm run build:content && npm run correo (y súbelas con la edición).",
    "#   [ ] Quita `draft: true`. Ensayo en seco primero (dryRun). Tras enviar, `sent: true`.",
  ];

  const bloques = [
    ...(obra.length > 0
      ? [
          "construido:",
          ...obra.flatMap((c) => [
            `  - titulo: ${yaml(c.titulo)}`,
            `    url: ${yaml(c.url)}`,
            `    frase: ${yaml(c.frase)}`,
            `    fecha: ${c.fecha}`,
            `    tipo: ${c.tipo}`,
            `    proyecto: ${c.proyecto}`,
            ...(c.imagen ? imagenYaml(c.imagen, "    ") : []),
          ]),
        ]
      : []),
    // A proposal: if the important thing is yours, change the card or delete it.
    ...(destacada
      ? [
          "importante:",
          `  titulo: ${yaml(destacada.titular)}`,
          `  url: ${yaml(destacada.url)}`,
          `  fuente: ${yaml(destacada.medio)}`,
          ...(destacada.imagen ? imagenYaml(destacada.imagen, "  ") : []),
        ]
      : []),
    ...(skill ? [`skill: ${skill}`] : []),
    'pregunta: "{{PREGUNTA: una sola, que se pueda contestar con una línea.}}"',
  ];

  const frontmatter = [
    "---",
    ...cabecera,
    `issue: ${id}`,
    // Short on purpose: the frontmatter schema caps `subject` at 120 characters, and a
    // placeholder longer than that made `velite build --strict` fail on a fresh
    // draft. The emoji guidance lives in the header checklist above.
    'subject: "{{ASUNTO: emoji + lo más importante, con tus palabras}}"',
    'preheader: "{{ANTETÍTULO: una frase que complete el asunto}}"',
    `title: "La semana ${rango}"`,
    `date: ${semana.hasta}`,
    "tipo: semanal",
    "semana:",
    `  desde: ${semana.desde}`,
    `  hasta: ${semana.hasta}`,
    ...bloques,
    "draft: true",
    "---",
  ];

  // Headline and link, no summary: the rest of the week stays one line each,
  // so the email is the news that matters and not a list (2026-10-15).
  const noticias = resto.map((n) => {
    const destino = n.protagonista
      ? `[Leer el artículo](${enlace(propio(n.url))}) · fuente: ${texto(n.medio)}`
      : `[${texto(n.medio)}](${enlace(n.url)})`;
    return `**${texto(n.titular)}**${SALTO}${destino}`;
  });

  const cuerpo = [
    `### ${TITULO_IMPORTANTE}`,
    destacada
      ? "{{LO IMPORTANTE: qué ha pasado esta semana, a ti o en el mundo, y qué le cambia a quien te lee. Dos o tres párrafos tuyos. Arriba, en `importante`, te propongo la noticia más fuerte; si lo importante es otra cosa, cambia su título y su enlace o quítalo.}}"
      : "{{LO IMPORTANTE: qué ha pasado esta semana, a ti o en el mundo, y qué le cambia a quien te lee. Dos o tres párrafos tuyos. No hubo ediciones diarias de las que partir: si es algo tuyo, añade arriba `importante` con su título, o envíala solo con el texto.}}",
    ...(noticias.length > 0 ? [`### ${TITULO_NOTICIAS}`, ...noticias] : []),
  ];

  return `${frontmatter.join("\n")}\n\n${cuerpo.join("\n\n")}\n`;
}

/**
 * The news section of a weekly edition, as HTML: what sits between the heading
 * `TITULO_NOTICIAS` and the next heading. Null when the edition has none.
 */
export function seccionDeNoticias(html: string): string | null {
  return seccion(html, TITULO_NOTICIAS);
}

/** What sits between the `<h3>` titled `titulo` and the next heading. Null when absent or empty. */
export function seccion(html: string, titulo: string): string | null {
  const exacto = titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const encontrada = html.match(new RegExp(`<h3[^>]*>\\s*${exacto}\\s*</h3>([\\s\\S]*?)(?=<h[1-3][\\s>]|$)`));
  const contenido = encontrada?.[1].trim();
  return contenido ? contenido : null;
}
