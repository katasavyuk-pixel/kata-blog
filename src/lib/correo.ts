/**
 * What a newsletter edition needs to travel by email: its images in a format
 * and a crop every mail client shows, links that say they came from the email,
 * and inline styles for the HTML Velite compiles from markdown.
 *
 * Pure: no files, no content. The email template, the web archive, the script
 * that prepares the images (scripts/correo/preparar.ts) and the tests all read
 * these same functions, so they cannot disagree about a path.
 */

/**
 * The crops an edition uses, at twice the size they are shown (retina). Mail
 * clients ignore `object-fit`, so each image is cut to its box beforehand.
 */
export const FORMATOS_DE_CORREO = {
  /** Under the header, edge to edge. */
  cabecera: { ancho: 600, alto: 280 },
  /** «La noticia que importa», inside the margins. */
  ancha: { ancho: 536, alto: 220 },
  /** «Lo que he construido», next to its text. */
  tarjeta: { ancho: 168, alto: 112 },
  /** The skill photo, 4:5 like on the site. */
  skill: { ancho: 200, alto: 250 },
} as const;

export type FormatoDeCorreo = keyof typeof FORMATOS_DE_CORREO;

/** Width and height of the animated sequence, as shown (the GIF is twice that). */
export const SECUENCIA_EN_CORREO = { ancho: 536, alto: 120 } as const;

/**
 * Where the email version of a picture lives: a JPEG cut to the crop, under
 * /correo, made by `npm run correo`. WebP is out because classic Outlook cannot
 * show it, and the site's pictures are all WebP.
 *
 * "/covers/bienvenida.webp" + "cabecera" → "/correo/covers/bienvenida-cabecera.jpg"
 */
export function imagenDeCorreo(src: string, formato: FormatoDeCorreo): string {
  return `/correo${src.replace(/\.(webp|jpe?g|png)$/i, "")}-${formato}.jpg`;
}

/** The sequence diagram of an edition, as a GIF (also made by `npm run correo`). */
export const gifDeSecuencia = (issue: string): string => `/correo/${issue}/secuencia.gif`;

/** A path of this site becomes a full URL: in an email, "/blog/x" goes nowhere. */
export const absoluta = (url: string, siteUrl: string): string => (url.startsWith("/") ? `${siteUrl}${url}` : url);

export const conUtm = (url: string, campaña: string): string =>
  `${url}${url.includes("?") ? "&" : "?"}utm_source=newsletter&utm_medium=email&utm_campaign=${campaña}`;

/**
 * A link as the email carries it: full, and tagged when it points at this site
 * (so a visit from the email is told apart from one from the web). Links to
 * other sites go as they are, and one already tagged is not tagged twice.
 */
export function enlaceDeCorreo(url: string, siteUrl: string, issue: string): string {
  const completa = absoluta(url, siteUrl);
  if (!completa.startsWith(siteUrl) || completa.includes("utm_source=")) return completa;
  return conUtm(completa, issue);
}

export type Seccion = { titulo: string; html: string };

/**
 * The body cut at its `###` headings: what comes before the first one (the
 * greeting) and each section after it. The templates put the edition's own
 * blocks in between, so the greeting stays first and the sections keep their
 * order. `titulo` is HTML, as Velite wrote it (entities included).
 */
export function partirCuerpo(html: string): { entrada: string; secciones: Seccion[] } {
  const partes = html.split(/(?=<h3[\s>])/);
  const entrada = partes[0]?.startsWith("<h3") ? "" : (partes.shift() ?? "");
  const secciones = partes.map((parte) => {
    const [, titulo = "", resto = ""] = parte.match(/^<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*)$/) ?? [];
    return { titulo: titulo.trim(), html: resto.trim() };
  });
  return { entrada: entrada.trim(), secciones };
}

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Arial,Helvetica,sans-serif";

/** Inline styles per tag, in the email's colours (src/lib/email-colors.ts). */
const ESTILOS: Record<string, string> = {
  p: `margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:#140a0d`,
  h2: `margin:28px 0 10px;font-family:${SERIF};font-size:22px;font-weight:400;line-height:1.25;color:#140a0d`,
  h3: `margin:28px 0 10px;font-family:${SERIF};font-size:20px;font-weight:400;line-height:1.25;color:#140a0d`,
  ul: "margin:0 0 16px;padding:0 0 0 20px",
  ol: "margin:0 0 16px;padding:0 0 0 20px",
  li: `margin:0 0 6px;font-family:${SANS};font-size:16px;line-height:1.55;color:#140a0d`,
  a: "color:#c40f1f;text-decoration:underline",
  blockquote: "margin:0 0 16px;padding:0 0 0 16px;border-left:3px solid #e11423",
  img: "display:block;max-width:100%;height:auto;border:0",
  hr: "margin:24px 0;border:0;border-top:1px solid #e3d9d6",
};

/**
 * Gives the HTML Velite compiled from markdown the email's type: mail clients
 * drop <style> blocks or apply them badly, so every tag carries its own. A tag
 * that already has a `style` (the pre-rendered blocks of the welcome sequence:
 * buttons, tables) is left exactly as it is.
 */
export function estilarHtml(html: string): string {
  return html.replace(/<(p|h2|h3|ul|ol|li|a|blockquote|img|hr)(\s[^>]*?)?(\s?\/)?>/g, (etiqueta, tag: string, attrs = "", cierre = "") =>
    /\sstyle=/.test(attrs) ? etiqueta : `<${tag}${attrs} style="${ESTILOS[tag]}"${cierre}>`,
  );
}
