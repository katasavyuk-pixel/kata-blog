import type { Metadata } from "next";
/**
 * Single source of truth for the site's textual identity (brief §1).
 *
 * The whole site reads from here — this is the only file you edit to set
 * name / domain / bio / socials. Kept i18n-ready: text lives in config, not
 * hardcoded in components.
 *
 * Positioning (2026-10-06, "the operator"): AI systems that already run in a
 * small business, shown with their numbers and with what broke. Reader #1 runs
 * a small business and wants to apply AI. One promise, repeated verbatim on the
 * home, the inline CTAs, the welcome sequence and the newsletter FAQ —
 * tests/promesa.test.ts fails the build when an older promise comes back.
 * NBI keeps its own path through the site and is never sold on the home.
 * The priced sprint (checklist, reminders, panel) is no longer offered here: see config/nbi-diagnostico.ts.
 *
 * That used to read "NBI (an AI company)", sixteen lines above the comment
 * that forbids exactly that wording. The voice rules say "construye NBI", not
 * "a company", and a rule contradicted inside its own file is a rule that will
 * be broken by whoever reads the top first.
 */

export type SocialLink = { label: string; href: string };

export const siteConfig = {
  /** §1 NOMBRE_MARCA — marca personal = tu nombre. */
  name: "Kata Ivanovych",
  /** §1 DOMINIO (without protocol) — subdominio del dominio NBI ianexora.com. */
  domain: "kata.ianexora.com",
  /** Absolute base URL — used for metadataBase / canonical / OG. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kata.ianexora.com",
  /** §1 TAGLINE — one line: what you promise and to whom. */
  // Singular on purpose ("un negocio real"): production today is my own
  // business plus one pilot. "Pequeño" went on 2026-10-15 at Kata's request:
  // it made the reader, and him, feel small. "Sus números" holds without euro
  // costs — counts and failure tallies are numbers too, and every one needs a
  // dated source.
  tagline:
    "Sistemas de IA que ya funcionan en un negocio real. Con sus números y con lo que se rompió.",
  /** Mono label above the home headline. Email 2 already calls the blog this. */
  kicker: "El cuaderno de obra de Kata Ivanovych",
  /**
   * The home's own words (2026-10-14). Kata found a home that opened with his
   * face and his promise too much about him: the home is now the map of what
   * a reader can do here, and the promise above (`tagline`) moved to
   * /sobre-mi with the portrait. He chose the first of three titulares on the
   * canvas by default; the other two were «Aplica IA en tu negocio con lo que
   * ya funciona.» and «Lo que pasa en IA y lo que puedes hacer con ella hoy,
   * en un negocio pequeño.» On 2026-10-15 «para un negocio pequeño» became
   * «para tu negocio»: «pequeño» made the reader feel small.
   */
  home: {
    titular: "Noticias, herramientas y skills de IA para tu negocio.",
    subtitulo:
      "Las noticias del día sobre IA, negocio, tecnología y geopolítica. Herramientas que funcionan en el navegador, skills para Claude, Codex y otros agentes, y guías con sus números. Y un correo cuando hay algo que enseñar.",
  },
  /** Default meta description (1–2 sentences). */
  // "mi negocio", never "una empresa": the voice is one person, first person
  // singular.
  description:
    "Documento cada sistema de IA que pongo en marcha en mi negocio: qué hace, sus números y qué falló. Para quien dirige un negocio y quiere aplicar IA.",
  /** Primary content language. */
  locale: "es",
  /**
   * Contact inbox: the privacy policy, /trabaja-con-nbi and /api/contact.
   * Same mailbox as `replyEmail`, on purpose: one inbox that is read.
   */
  contactEmail: "info@ianexora.com",
  /**
   * Public address for "just reply and tell me". Same mailbox as RESEND_REPLY_TO,
   * which is a server env and therefore unusable in a mailto: link.
   *
   * Deliberately not `contactEmail` — that one is the privacy/data-rights inbox,
   * and routing "tell me about your process" there mixes a legal channel with a
   * conversational one.
   *
   * Verified end to end on 2026-08-05: Kata replied to a sequence email and it
   * arrived. Reply rate is the metric for this phase, so this link and the
   * sequence's "responde a este email" both rest on it.
   */
  replyEmail: "info@ianexora.com",
  /** Reader #1: runs a small business and wants to apply AI. */
  audience: "quien dirige un negocio y quiere aplicar IA sin fiarse de una demo",
  author: {
    /** §1 TU_NOMBRE */
    name: "Kata Ivanovych",
    /** How the home introduces the author: "Soy Kata." */
    firstName: "Kata",
    /**
     * The name behind the byline. ianexora.com declares the relationship from its
     * side ("En el blog firmo como Kata Ivanovych", decision D5 of the
     * ianexora.com SEO plan):
     * declare it, don't unify the two brands. Same words in the footer, in
     * /sobre-mi and in the `Person` node, so schema and page never disagree.
     */
    alternateName: "Katalin Savyuk",
    /** Where that name has its own page: the reciprocal of ianexora.com's side. */
    profileUrl: "https://ianexora.com/sobre-katalin-savyuk",
    profileLabel: "Más en ianexora.com",
    /**
     * Visible line. Approved vocabulary only: "construye NBI",
     * never a role, "la empresa", "somos" or a legal form.
     */
    byline:
      "Kata Ivanovych es el nombre con el que firma Katalin Savyuk, que construye NBI (Nexora Business Intelligence).",
    /** §1 TU_BIO_CORTA — identity in one line + credential + mission. */
    bio: "Construyo NBI, mi negocio de automatización con IA, y aquí documento cada sistema que pongo en marcha: qué hace, cómo está montado y dónde falló.",
  },
  /** The public journey — anchors the "semana N" line on /sobre-mi. */
  journey: {
    /** ISO date the public build started (first commit of this site). */
    start: "2026-06-24",
    /** Current mission, shown in the status panel. Update as it changes. */
    mission: "primeros clientes de NBI",
  },
  social: [
    { label: "YouTube", href: "https://www.youtube.com/channel/UCizhz3u2FTUjSf-hqvNGKOQ" },
    // Without the trailing slash: the same string ianexora.com publishes (audit of 17-oct-2026).
    { label: "LinkedIn", href: "https://www.linkedin.com/in/katalin-savyuk-b024b7408" },
    { label: "X", href: "https://x.com/Kata_malavie" },
    { label: "GitHub", href: "https://github.com/katasavyuk-pixel" },
    { label: "Instagram", href: "https://www.instagram.com/nbi_ianexora/" },
  ] as SocialLink[],
  /** Newsletter copy: the same promise as the tagline, as a delivery. */
  newsletter: {
    title: "Lo importante de la semana, en tu correo",
    description:
      "Te escribo con lo importante de la semana: un sistema que he puesto en marcha, con sus números y lo que se rompió, o algo que ha pasado en la IA y qué te cambia.",
    cta: "Suscribirme",
    /**
     * Cadence, stated as a ceiling. Weekly since 2026-10-16 (Kata: one email a
     * week with the one thing that matters); "como mucho" keeps it true in a
     * week with nothing worth sending.
     */
    magnet:
      "Como mucho, un correo a la semana. Si no hay nada importante, no hay correo.",
    /** The signup gift (src/config/regalo.ts), said next to every main form. */
    regalo:
      "Al confirmar te llega un regalo: «Recupera horas de tu semana con IA», una hoja que te dice qué tareas de tu semana le puedes pasar ya a la IA y una ficha para que trabaje a tu manera.",
    /** Value-prop checklist shown next to the home capture form (honest, no metrics). */
    bullets: [
      "Un sistema que ya funciona en mi negocio, explicado para que lo puedas montar.",
      "Sus números, con la fuente al lado. Y cuando no tengo el dato, lo digo.",
      "Lo que se rompió y cómo lo arreglé. También cuando sigue sin arreglar.",
    ],
    /** Hide the subscriber count below this threshold (honest social proof only). */
    showCountFrom: 100,
  },
} as const;

export type SiteConfig = typeof siteConfig;

/**
 * The four doors of the home, in its order (2026-10-14): the news, the
 * marketplace of skills, the tools that run in the browser and the reading.
 * «Sobre mí» left the header for the footer on 14-oct and came back on 15-oct,
 * also at Kata's request: last, after what a reader can do, and after the
 * build log (Bitácora), which is his too. The old routes redirect
 * (/recursos → /herramientas, /sistemas/<id> → /marketplace/<id>); /sistemas
 * stays as the shelf of systems I run, reached from «Lecturas». The course, the
 * glossary and NBI live in the footer; NBI is never in the header.
 */
export const navLinks = [
  { label: "Noticias", href: "/noticias" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Herramientas", href: "/herramientas" },
  { label: "Lecturas", href: "/blog" },
  { label: "Bitácora", href: "/bitacora" },
  { label: "Sobre mí", href: "/sobre-mi" },
] as const;

/** Secondary destinations, in footer order. Also read by /llms.txt. */
export const footerLinks = [
  { label: "Vídeos", href: "/videos" },
  { label: "Curso", href: "/empieza-aqui" },
  { label: "Glosario", href: "/glosario" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "NBI", href: "/trabaja-con-nbi" },
] as const;

export const legalLinks = [
  { label: "Privacidad", href: "/privacidad" },
  { label: "Cookies", href: "/cookies" },
] as const;

/**
 * Two feeds, so subscribing to what I write does not mean receiving an
 * automated edition every day. Titles are distinct because a feed reader shows
 * nothing else when it offers the choice.
 */
export const feeds = {
  editorial: {
    href: "/feed.xml",
    title: `${siteConfig.name} — sistemas, notas y curso`,
  },
  noticias: {
    href: "/noticias/feed.xml",
    title: `${siteConfig.name} — Noticias de IA`,
  },
  bitacora: {
    href: "/bitacora/feed.xml",
    title: `${siteConfig.name} — Bitácora`,
  },
} as const;

/**
 * The feed autodiscovery links, as an `alternates` fragment. Next merges
 * metadata shallowly per segment: a page that sets `alternates: { canonical }`
 * replaces the layout's whole `alternates`, feeds included. Every page that
 * declares its own `alternates` spreads this in (`/noticias` is the exception:
 * it advertises only its own feed).
 */
export const feedAlternates = {
  types: {
    // Two feeds, two titles: a reader that autodiscovers them shows only this.
    "application/rss+xml": [
      { url: feeds.editorial.href, title: feeds.editorial.title },
      { url: feeds.noticias.href, title: feeds.noticias.title },
    ],
  },
};

/**
 * One signup form per page. The footer carries one on every page, and these
 * routes already render their own, so the footer drops its copy there.
 *
 * A pathname list rather than something structural because the footer is
 * mounted once, in `SiteChrome`, which is already a client component that
 * branches on `usePathname()` for /enlaces and /panel. The alternatives were
 * worse: route groups with two layouts would move half of `src/app`, and a
 * page cannot hand a flag up to a sibling that renders after it.
 * tests/arquitectura.test.ts keeps this list honest in both directions.
 */
const OWN_SIGNUP_FORM_ROUTES: readonly string[] = [
  "/",
  "/newsletter",
  "/herramientas",
  "/herramientas/ficha-para-tu-ia",
  "/sobre-mi",
];

export function hasOwnSignupForm(pathname: string): boolean {
  if (OWN_SIGNUP_FORM_ROUTES.includes(pathname)) return true;
  // Articles close with the form. The archive (/blog) and tag listings
  // (/blog/tag/<tag>) do not.
  return /^\/blog\/[^/]+$/.test(pathname);
}

/**
 * The person behind both sites, as ONE entity (Katalin, 17-oct-2026).
 *
 * Until then the blog declared its own `Person` («Kata Ivanovych», @id on this
 * domain) and ianexora.com another («Katalin Savyuk», @id there): two entities
 * for one person, neither pointing at the other. Now both sites emit this same
 * node: the @id ianexora.com already published, the name its pages use, the pen
 * name as `alternateName`, and one `sameAs`. ianexora.com defines it
 * (lib/seo/schema.ts there): change the two together. The visible byline here
 * stays «Kata Ivanovych» (siteConfig.author).
 */
export const PERSONA = {
  id: "https://ianexora.com/sobre-katalin-savyuk#person",
  name: "Katalin Savyuk",
  alternateName: "Kata Ivanovych",
  url: "https://ianexora.com/sobre-katalin-savyuk",
  image: "https://ianexora.com/images/katalin-donostia.jpg",
  jobTitle: "Fundador de NBI",
  worksFor: "https://ianexora.com/#organization",
  /**
   * The profiles the footer links, and this blog — written out, not
   * `siteConfig.url`, which a preview deploy overrides. The same list on ianexora.com.
   */
  sameAs: [...siteConfig.social.map((link) => link.href), "https://kata.ianexora.com"],
} as const;

/**
 * What every indexable page tells Googlebot: full snippets and the large image
 * preview Discover needs for its big card (covers are 1672 px wide). Set once
 * in the root layout; tests/indexacion.test.ts keeps it there.
 */
export const ROBOTS_GOOGLE = {
  index: true,
  follow: true,
  "max-image-preview": "large",
  "max-snippet": -1,
  "max-video-preview": -1,
} as const;

/**
 * The home's whole <title>, and the shorter one its shared card carries (brief
 * of 17-oct-2026). The layout's default and the home's own metadata share it.
 * Kept within 60 characters: Kata chose the short versions on 17-oct, since
 * Google cut the brief's longer ones.
 */
export const TITULO_HOME = `Sistemas de IA en un negocio real · ${siteConfig.name}`;
export const TITULO_HOME_TARJETA = `Sistemas de IA en un negocio real — ${siteConfig.name}`;

/**
 * The card a shared link shows when the page has no picture of its own:
 * src/app/opengraph-image.tsx, served at this path.
 */
export const IMAGEN_OG_POR_DEFECTO = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: siteConfig.name,
} as const;

type OpenGraph = NonNullable<Metadata["openGraph"]>;
type Imagenes = NonNullable<OpenGraph["images"]>;

/**
 * A page's metadata with its Open Graph and Twitter blocks built whole, in one place.
 *
 * Next merges metadata shallowly per segment and replaces `openGraph` and
 * `twitter` wholesale, so a page that declares either loses everything the
 * layout set in it: the default card image (25 of 57 URLs had none, audit of
 * 17-oct-2026) and, for `twitter`, the title, which stayed «Kata Ivanovych» on
 * 34 pages. And a page that declares neither used to inherit the layout's
 * `og:url`, the site root, so sharing it showed the home. Built here:
 *   - og:title and twitter:title are the page's <title>, unless the page passes
 *     a title written for the shared card (`social.title`);
 *   - og:url is the page's own path;
 *   - the image is the page's own, or the default card.
 */
export function withOpenGraph(
  path: string,
  meta: Metadata & { title: string | { absolute: string }; description: string },
  social: { title?: string; description?: string; images?: Imagenes; ogExtra?: Partial<OpenGraph> } = {},
): Metadata {
  const titulo = typeof meta.title === "string" ? `${meta.title} · ${siteConfig.name}` : meta.title.absolute;
  const title = social.title ?? titulo;
  const description = social.description ?? meta.description;
  const images = social.images ?? [IMAGEN_OG_POR_DEFECTO];
  const urls = (Array.isArray(images) ? images : [images]).map((i) =>
    typeof i === "string" || i instanceof URL ? i : i.url,
  );
  return {
    ...meta,
    openGraph: {
      type: "website",
      locale: "es_ES",
      siteName: siteConfig.name,
      ...social.ogExtra,
      title,
      description,
      url: path,
      images,
    } as OpenGraph,
    twitter: { card: "summary_large_image", title, description, images: urls },
  };
}
