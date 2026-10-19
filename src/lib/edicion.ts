import type { NewsletterIssue } from "#site/content";
import { PROYECTOS, TIPOS_ENTRADA } from "@/config/bitacora";
import { LOGOS_DE_SKILL } from "@/config/logos";
import { getActivo } from "@/lib/catalogo";
import { gifDeSecuencia, partirCuerpo, type FormatoDeCorreo, type Seccion } from "@/lib/correo";
import { htmlToText } from "@/lib/email-template";
import { TITULO_IMPORTANTE, TITULO_NOTICIAS } from "@/lib/semanal";

/**
 * One newsletter edition, read the same way by the email (src/emails/edicion.tsx)
 * and by its page in the archive (/newsletter/<issue>): which blocks it has, in
 * what words, and what it needs prepared before it can be sent.
 *
 * The blocks are Kata's two formats of 2026-10-15: «N1», one system in a minute
 * (photo, three points, the sequence animated, a button), and «N2», the weekly
 * parte (since 2026-10-16: the one important thing of the week, what I built,
 * a skill). An edition can carry any of them; one with none is its body, as
 * the old ones were.
 */

export type Edicion = Pick<
  NewsletterIssue,
  | "issue"
  | "title"
  | "date"
  | "tipo"
  | "semana"
  | "html"
  | "imagen"
  | "minuto"
  | "secuencia"
  | "boton"
  | "construido"
  | "importante"
  | "skill"
  | "pregunta"
>;

/** Has any block of the visual edition. The old ones keep the standard closing instead. */
export function esVisual(edicion: Edicion): boolean {
  return Boolean(
    edicion.imagen ||
      edicion.minuto?.length ||
      edicion.secuencia ||
      edicion.boton ||
      edicion.construido?.length ||
      edicion.importante ||
      edicion.skill ||
      edicion.pregunta,
  );
}

/**
 * The body in the order the edition is drawn: the greeting (before the first
 * `###`), the important thing (the section titled `TITULO_IMPORTANTE`, which
 * the `importante` card frames), every other section in its order, and the
 * rest of the week's news (`TITULO_NOTICIAS`), which goes last, before the
 * question (Kata, 2026-10-16: «lo importante es que lea el recurso»).
 */
export function partesDeEdicion(edicion: Pick<Edicion, "html">): {
  entrada: string;
  importante: string | null;
  secciones: Seccion[];
  noticias: Seccion | null;
} {
  const { entrada, secciones } = partirCuerpo(edicion.html);
  const titulo = (s: Seccion) => s.titulo.replace(/<[^>]+>/g, "").trim();
  return {
    entrada,
    importante: secciones.find((s) => titulo(s) === TITULO_IMPORTANTE)?.html ?? null,
    secciones: secciones.filter((s) => titulo(s) !== TITULO_IMPORTANTE && titulo(s) !== TITULO_NOTICIAS),
    noticias: secciones.find((s) => titulo(s) === TITULO_NOTICIAS) ?? null,
  };
}

/** The important thing's link: its own words, «Leer la noticia · El País» for news, or «Saber más». */
export const rotuloDeImportante = (importante: { fuente?: string; rotulo?: string }): string =>
  importante.rotulo ?? (importante.fuente ? `Leer la noticia · ${importante.fuente}` : "Saber más");

/** "Edición semanal" (its title already says the days), or the date: "15 oct 2026". */
export function cabeceraDeEdicion(edicion: Pick<Edicion, "tipo" | "date">): string {
  if (edicion.tipo === "semanal") return "Edición semanal";
  return new Date(edicion.date)
    .toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .replace(".", "");
}

/** «15 oct · Mejora»: when, and what kind of change. */
export function etiquetaDeConstruido(item: { fecha: string; tipo: keyof typeof TIPOS_ENTRADA }): string {
  const dia = new Date(item.fecha)
    .toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" })
    .replace(".", "");
  return `${dia} · ${TIPOS_ENTRADA[item.tipo].label}`;
}

/** What the ink tile says when a built thing has no picture: its project. */
export const proyectoDe = (proyecto: keyof typeof PROYECTOS): string => PROYECTOS[proyecto];

export type SkillDeEdicion = {
  id: string;
  titulo: string;
  texto: string;
  href: string;
  color: string;
  foto?: string;
};

/** The marketplace skill an edition recommends, with its colour and photo. */
export function skillDeEdicion(id: string): SkillDeEdicion | undefined {
  const activo = getActivo(id);
  const logo = LOGOS_DE_SKILL[id];
  if (!activo || !logo) return undefined;
  return {
    id,
    titulo: activo.title,
    texto: activo.queHace ?? activo.blurb,
    href: activo.href,
    color: logo.color,
    foto: logo.foto,
  };
}

/**
 * Every picture the email of this edition shows, with its crop: what
 * `npm run correo` has to make and what the tests check is there before an
 * edition can be sent. The GIF of the sequence is separate (`gifDeSecuencia`).
 */
export function imagenesDeEdicion(edicion: Edicion): { src: string; formato: FormatoDeCorreo }[] {
  const skill = edicion.skill ? skillDeEdicion(edicion.skill) : undefined;
  return [
    ...(edicion.imagen ? [{ src: edicion.imagen.src, formato: "cabecera" as const }] : []),
    ...(edicion.construido ?? []).flatMap((item) => (item.imagen ? [{ src: item.imagen.src, formato: "tarjeta" as const }] : [])),
    ...(edicion.importante?.imagen ? [{ src: edicion.importante.imagen.src, formato: "ancha" as const }] : []),
    ...(skill?.foto ? [{ src: skill.foto, formato: "skill" as const }] : []),
  ];
}

/** Files the email needs besides the pictures: the sequence GIF. */
export const animacionesDeEdicion = (edicion: Pick<Edicion, "issue" | "secuencia">): string[] =>
  edicion.secuencia ? [gifDeSecuencia(edicion.issue)] : [];

/**
 * Every field a person writes, as text: where a `{{block}}` left in a draft
 * would hide. The send refuses while one is left (src/lib/newsletter.tsx).
 */
export function textosDeEdicion(edicion: Edicion): string[] {
  return [
    ...(edicion.minuto ?? []),
    edicion.secuencia ? JSON.stringify(edicion.secuencia) : "",
    edicion.boton ? JSON.stringify(edicion.boton) : "",
    edicion.construido ? JSON.stringify(edicion.construido) : "",
    edicion.importante ? JSON.stringify(edicion.importante) : "",
    edicion.pregunta ?? "",
    edicion.imagen?.alt ?? "",
  ].filter(Boolean);
}

/**
 * The plain-text part of the email, in the order of the HTML one. An email
 * with HTML only reads as bulk mail, and a text reader has to get the blocks
 * too, not just the body.
 */
export function textoDeEdicion(edicion: Edicion, enlace: (url: string) => string): string {
  const skill = edicion.skill ? skillDeEdicion(edicion.skill) : undefined;
  const { entrada, importante, secciones, noticias } = partesDeEdicion(edicion);
  const texto = (html: string) => htmlToText(html).trim();
  const seccionEnTexto = (seccion: Seccion) => `${texto(seccion.titulo).toUpperCase()}\n\n${texto(seccion.html)}`;
  const partes: string[] = [edicion.title];
  if (edicion.minuto?.length) partes.push(["En un minuto:", ...edicion.minuto.map((punto) => `- ${punto}`)].join("\n"));
  if (edicion.secuencia) partes.push(`${edicion.secuencia.titulo}: ${edicion.secuencia.alt}`);
  if (entrada) partes.push(texto(entrada));
  if (edicion.importante || importante) {
    partes.push(
      [
        TITULO_IMPORTANTE.toUpperCase(),
        edicion.importante?.titulo,
        importante && texto(importante),
        edicion.importante?.url && `${rotuloDeImportante(edicion.importante)}: ${enlace(edicion.importante.url)}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }
  if (edicion.construido?.length) {
    partes.push(
      [
        "LO QUE HE CONSTRUIDO",
        ...edicion.construido.map((item) => `${item.titulo}\n${item.frase} (${enlace(item.url)})`),
      ].join("\n\n"),
    );
  }
  for (const seccion of secciones) partes.push(seccionEnTexto(seccion));
  if (edicion.boton) partes.push(`${edicion.boton.texto}: ${enlace(edicion.boton.url)}`);
  if (skill) partes.push(["PARA USAR ESTA SEMANA", `${skill.titulo}: ${skill.texto}`, enlace(skill.href)].join("\n"));
  if (noticias) partes.push(seccionEnTexto(noticias));
  if (edicion.pregunta) partes.push(`Una cosa que te pido: ${edicion.pregunta}\n\nLo leo yo.\nKata`);
  return partes.filter(Boolean).join("\n\n") + "\n";
}
