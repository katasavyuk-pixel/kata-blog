/**
 * The header and footer of ianexora.com, ported to the blog (26-nov-2026).
 *
 * Kata asked for ianexora.com/blog to look like part of the NBI website: same
 * header and menu, footer, palette, type and logo. The two sites are separate
 * Next apps (multi-zone), so this file is a COPY of the menu and footer of
 * NBI-WEB `lib/content/site.ts` (`nav`, `footer`), taken on 26-nov-2026. When
 * those change there, change them here: tests/nbi-chrome.test.ts pins the
 * menu order so a drift is a conscious edit.
 *
 * Every NBI destination is an absolute https://ianexora.com URL and is
 * rendered with a plain <a>: it belongs to the other zone, so it must be a full
 * page load, never a client-side <Link> navigation.
 *
 * What is NOT copied, on purpose: the location lines and the two local sector
 * pages of NBI's footer. The blog never names the town
 * (the guardian test of the town name), and no street address is published anywhere.
 */
import { NBI_ORIGIN } from "@/config/base-path";

export type EnlaceNbi = { label: string; href: string; external?: boolean };

const nbi = (path: string) => `${NBI_ORIGIN}${path}`;

export const NBI_LOGO = {
  // public/nbi/logo-horizontal.png = NBI-WEB public/images/logo-horizontal.png (532×142).
  src: "/nbi/logo-horizontal.png",
  alt: "NBI Nexora",
  width: 532,
  height: 142,
} as const;

/** NBI-WEB `nav.links`, with the anchors resolved to the home, plus «Blog». */
export const NBI_MENU: readonly EnlaceNbi[] = [
  { label: "Cómo funciona", href: nbi("/como-trabaja-nbi") },
  { label: "Agentes", href: nbi("/agentes") },
  { label: "Inmobiliarias", href: nbi("/inmobiliarias") },
  { label: "Seguridad", href: nbi("/#seguridad") },
  { label: "Preguntas", href: nbi("/#preguntas") },
  // The item NBI-WEB gains in the same cutover. Inside this zone it is the
  // blog's home, so it is the active one on every blog page.
  { label: "Blog", href: "/" },
];

/** NBI-WEB `nav.cta`: the site's one action. */
export const NBI_CTA: EnlaceNbi = { label: "Pedir la llamada", href: nbi("/contacto") };

/** NBI-WEB `footer.blurb`. */
export const NBI_BLURB =
  "NBI (Nexora Business Intelligence): consultoría, automatización y agentes de IA para pymes. Mide dónde se pierden horas y dinero y construye los sistemas que lo resuelven.";

export type ColumnaNbi = { title: string; links: readonly EnlaceNbi[] };

/** NBI-WEB `footer.columns`, without the local pages (see the note above). */
export const NBI_COLUMNAS: readonly ColumnaNbi[] = [
  {
    title: "NBI",
    links: [
      { label: "Cómo funciona", href: nbi("/como-trabaja-nbi") },
      { label: "El diagnóstico", href: nbi("/servicios/diagnostico-de-procesos") },
      { label: "Automatización", href: nbi("/servicios/automatizacion-de-procesos") },
      { label: "Agentes", href: nbi("/agentes") },
      { label: "Guías", href: nbi("/guias") },
      { label: "Sobre NBI", href: nbi("/sobre-nbi") },
      { label: "Sobre Katalin Savyuk", href: nbi("/sobre-katalin-savyuk") },
    ],
  },
  {
    title: "Sectores",
    links: [
      { label: "Inmobiliarias", href: nbi("/inmobiliarias") },
      { label: "Gestorías y asesorías", href: nbi("/gestorias") },
      { label: "Aduanas y transitarios", href: nbi("/aduanas") },
      { label: "Transporte", href: nbi("/transporte") },
    ],
  },
  {
    title: "Contacto",
    links: [
      { label: "info@ianexora.com", href: "mailto:info@ianexora.com" },
      { label: "Pedir la llamada", href: nbi("/contacto") },
      { label: "LinkedIn de Katalin", href: "https://www.linkedin.com/in/katalin-savyuk-b024b7408", external: true },
    ],
  },
  {
    title: "Políticas",
    links: [
      { label: "Seguridad y datos", href: nbi("/seguridad") },
      // The blog keeps its own privacy and cookie texts (newsletter, lead
      // magnets, Turnstile) until Kata decides to merge them into NBI's.
      { label: "Privacidad del blog", href: "/privacidad" },
      { label: "Cookies del blog", href: "/cookies" },
      { label: "Aviso legal", href: nbi("/aviso-legal") },
    ],
  },
];

/** NBI-WEB `footer.bottom.copyright`. */
export const NBI_COPYRIGHT = "© 2026 NBI · Nexora Business Intelligence · Todos los derechos reservados";
