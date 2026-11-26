/**
 * Brand for every email (newsletter, confirmation, kit delivery, welcome):
 * ianexora.com's since 26-nov-2026 (Kata: the emails move to the NBI design).
 * Same palette as the site (globals.css, NBI-WEB's `tailwind` tokens): white
 * letter on NBI's pale blue, navy ink, cyan links and rules, navy pill button,
 * the navy footer of ianexora.com.
 *
 * React Email renders inline styles and has no access to the CSS theme, so the
 * values are repeated here. Contrast (WCAG): accent on white 5.46:1, on
 * `surface` 4.82:1; muted on white 5.58:1; white on the button 12.6:1.
 */
export const emailColors = {
  bg: "#f4f8fb", // NBI surface: the page around the letter
  card: "#ffffff", // the letter
  surface: "#eaf2f8", // boxes inside it («En un minuto», code)
  textMain: "#071e38", // NBI ink (navy)
  textSoft: "#3d4a5c", // body copy one step down
  textMuted: "#5d6979", // dates, metadata
  accent: "#07738d", // cyan ink: links and small labels
  rule: "#0d94b5", // cyan: rules, never small text
  buttonBg: "#0c3558", // navy: the button, as «Pedir la llamada» on ianexora.com
  onAccent: "#ffffff", // white on navy
  border: "#dbe3ec", // hairlines
  footerBg: "#031a34", // the navy footer of ianexora.com
  onFooter: "#c9d6e3", // text on it (11.8:1)
  onFooterLink: "#7fd6ea", // links on it (10.6:1)
} as const;

/**
 * ianexora.com sets Instrument Sans (and Instrument Serif in italics for the
 * odd accent). No mail client can be trusted with a web font, so each stack
 * names it first, for the clients that have it, and falls back to the
 * closest system faces.
 */
export const emailFonts = {
  sans: "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif",
  /** Headings: the same sans, semibold, as ianexora.com's h1/h2. */
  display: "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif",
  serif: "'Instrument Serif',Georgia,'Times New Roman',serif",
} as const;

/**
 * NBI's horizontal logo for email: a PNG with its white background baked in,
 * so it reads on a dark-mode client that repaints the header (a transparent
 * navy logo would vanish). Absolute, because a mail client has no base URL;
 * written out rather than built from `siteConfig.url`, which a preview deploy
 * overrides with a protected URL. It exists once the blog lives at
 * ianexora.com/blog (public/correo/nbi-logo-correo.png). 2× for retina.
 */
export const LOGO_CORREO = {
  src: "https://ianexora.com/blog/correo/nbi-logo-correo.png",
  ancho: 150,
  alto: 45,
  alt: "NBI · Nexora Business Intelligence",
} as const;

/**
 * Dark mode. Clients that honour `prefers-color-scheme` (Apple Mail, iOS,
 * Outlook for Mac, some Android clients) get NBI's navy instead of a white
 * letter glaring at night; the `[data-ogsc]` copies are for Outlook.com. A
 * client's own stylesheet `!important` beats inline styles that are not.
 * Gmail ignores <style> media queries and inverts by itself: light-on-dark
 * text and the logo's own white background survive that.
 */
export const CSS_MODO_OSCURO = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  html, body, .nbi-fondo { background-color: #031a34 !important; }
  .nbi-carta, .nbi-cabecera { background-color: #071e38 !important; }
  .nbi-carta p, .nbi-carta li, .nbi-carta h1, .nbi-carta h2, .nbi-carta h3, .nbi-carta td, .nbi-carta span, .nbi-carta strong { color: #e6eef6 !important; }
  .nbi-carta .nbi-tenue, .nbi-carta .nbi-tenue * { color: #a9b8c8 !important; }
  .nbi-carta a { color: #5cc8e0 !important; }
  .nbi-carta a.nbi-boton, .nbi-carta a.nbi-boton span { color: #03203d !important; background-color: #5cc8e0 !important; }
  .nbi-caja { background-color: #0c2a4a !important; }
  .nbi-linea { border-color: #1d3d5e !important; }
}
[data-ogsc] .nbi-fondo { background-color: #031a34 !important; }
[data-ogsc] .nbi-carta, [data-ogsc] .nbi-cabecera { background-color: #071e38 !important; }
[data-ogsc] .nbi-carta p, [data-ogsc] .nbi-carta li, [data-ogsc] .nbi-carta h1, [data-ogsc] .nbi-carta h2, [data-ogsc] .nbi-carta h3, [data-ogsc] .nbi-carta td { color: #e6eef6 !important; }
[data-ogsc] .nbi-carta a { color: #5cc8e0 !important; }
[data-ogsc] .nbi-carta a.nbi-boton, [data-ogsc] .nbi-carta a.nbi-boton span { color: #03203d !important; background-color: #5cc8e0 !important; }
[data-ogsc] .nbi-caja { background-color: #0c2a4a !important; }
`;
