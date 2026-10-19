/**
 * Structured data builders.
 *
 * Centralised for one reason above the others: the `<` → `\u003c` escape. An
 * unescaped `<` inside a JSON-LD script tag is an XSS vector, the article page
 * did that escape at the call site, and the next page to emit JSON-LD would have
 * had to remember. `jsonLdScript()` does it once, so nothing can skip it.
 *
 * Deliberately NOT here, and not anywhere yet:
 *
 * - **`WebSite` + `SearchAction`.** There is no search on this site. Declaring a
 *   search endpoint that does not exist is a lie a machine can check.
 * - **`FAQPage` on an article that has no questions.** `faqJsonLd` is only for a
 *   visible Q&A (the newsletter archive, /diagnostico and an article's own
 *   `faq` block). The `<Quiz>` widgets are exercises, not FAQs, and marking them
 *   up as FAQs would be structured spam.
 *
 * The `Person` node with `sameAs` used to be listed here as withheld episode-1
 * material; that episode was recorded (and pivoted to MaitreAI), so the
 * withholding reason expired and the node shipped on 2026-08-21.
 */

import { IMAGEN_OG_POR_DEFECTO, PERSONA, siteConfig } from "@/config/site";
import { FORMATO_AUTOMATICO } from "@/config/taxonomy";

type Json = Record<string, unknown>;

/**
 * The author as an entity: the node both sites share (`PERSONA`, 17-oct-2026).
 * `personJsonLd` defines it; everything else points at it.
 */
const PERSON_ID = PERSONA.id;
const WEBSITE_ID = `${siteConfig.url}/#website`;
const BLOG_ID = `${siteConfig.url}/blog#blog`;

/**
 * A reference to the Person node that still reads on its own: `@id` resolves it
 * where the node is on the page (the home and every article), and the name and
 * url cover a consumer that does not follow ids.
 */
function personRef(): Json {
  return { "@type": "Person", "@id": PERSON_ID, name: PERSONA.name, url: PERSONA.url };
}

const absoluta = (ruta: string) => (/^https?:\/\//.test(ruta) ? ruta : `${siteConfig.url}${ruta}`);

const MADRID = "Europe/Madrid";
const desfase = (instante: Date) =>
  new Intl.DateTimeFormat("en", { timeZone: MADRID, timeZoneName: "longOffset" })
    .formatToParts(instante)
    .find((p) => p.type === "timeZoneName")
    ?.value.replace("GMT", "") || "+00:00";

/**
 * A content date as a date and time with Madrid's offset, which is what
 * `datePublished`/`dateModified` should carry. Velite turns a frontmatter day
 * into midnight UTC (`2026-06-25T00:00:00.000Z`), which reads as the evening
 * before in Spain and has no hour anyone chose. The hour is not known, so a
 * day becomes the start of that day in Madrid (`2026-06-25T00:00:00+02:00`),
 * the same rule ianexora.com follows; a timestamp with a real time keeps it,
 * expressed in Madrid.
 */
export function fechaConZona(fecha: string): string {
  const instante = new Date(fecha);
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(fecha) || /T00:00:00(?:\.0+)?Z$/.test(fecha);
  const dia = soloDia
    ? fecha.slice(0, 10)
    : new Intl.DateTimeFormat("en-CA", { timeZone: MADRID }).format(instante);
  if (soloDia) return `${dia}T00:00:00${desfase(new Date(`${dia}T12:00:00Z`))}`;
  const hora = new Intl.DateTimeFormat("en-GB", {
    timeZone: MADRID,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(instante);
  return `${dia}T${hora}${desfase(instante)}`;
}

/** Serialise for a <script type="application/ld+json"> body. */
export function jsonLdScript(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * `TechArticle` for lessons, systems and tests, `BlogPosting` otherwise.
 *
 * TechArticle is the honest type for a piece whose body is a runnable
 * explanation with code and interactive widgets; a radar edition or a note is
 * not that. The rest are posts of this blog (`BlogPosting`, 17-oct-2026; it
 * was `Article`), and a post is `isPartOf` the Blog node of /blog.
 *
 * `image` is the cover the page already shares as og:image, absolute; a piece
 * without one (a newsletter edition) carries the default card, which is what
 * its og:image is. Dates go with Madrid's offset (`fechaConZona`).
 *
 * Also used by the newsletter archive pages — an edition on the open web is an
 * article. Issues don't declare a word count, so `wordCount` is optional and
 * omitted rather than zeroed: a 0 in machine-readable data asserts something
 * false, and the field is simply absent instead.
 *
 * An automated news piece has a publisher and no `author`: nobody wrote it, and
 * naming the person next to a text they neither wrote nor reviewed is the same
 * false statement in machine-readable form that the visible byline stopped
 * making. An invented Organization would be no better.
 */
export function articleJsonLd(post: {
  title: string;
  description: string;
  date: string;
  updated?: string;
  formato: string;
  tags: string[];
  permalink: string;
  metadata: { wordCount?: number };
  /** Lead news articles declare the story they are based on. */
  fuente_url?: string;
  fuente_titulo?: string;
  fuente_medio?: string;
  cover?: { src: string; width: number; height: number };
  coverAlt?: string;
}): Json {
  const url = `${siteConfig.url}${post.permalink}`;
  const technical =
    post.formato === "leccion" ||
    post.formato === "sistema" ||
    post.formato === "prueba";
  const image = post.cover
    ? { "@type": "ImageObject", url: absoluta(post.cover.src), width: post.cover.width, height: post.cover.height }
    : {
        "@type": "ImageObject",
        url: absoluta(IMAGEN_OG_POR_DEFECTO.url),
        width: IMAGEN_OG_POR_DEFECTO.width,
        height: IMAGEN_OG_POR_DEFECTO.height,
      };

  return {
    "@context": "https://schema.org",
    "@type": technical ? "TechArticle" : "BlogPosting",
    headline: post.title,
    description: post.description,
    image,
    datePublished: fechaConZona(post.date),
    dateModified: fechaConZona(post.updated ?? post.date),
    inLanguage: "es-ES",
    ...(post.permalink.startsWith("/blog/")
      ? { isPartOf: { "@type": "Blog", "@id": BLOG_ID, name: TITULO_BLOG, url: `${siteConfig.url}/blog` } }
      : {}),
    ...(post.metadata.wordCount
      ? { wordCount: post.metadata.wordCount }
      : {}),
    ...(post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
    ...(post.formato === FORMATO_AUTOMATICO ? {} : { author: personRef() }),
    publisher: personRef(),
    mainEntityOfPage: url,
    url,
    ...(post.fuente_url
      ? {
          isBasedOn: {
            "@type": "CreativeWork",
            url: post.fuente_url,
            ...(post.fuente_titulo ? { name: post.fuente_titulo } : {}),
            ...(post.fuente_medio
              ? { publisher: { "@type": "Organization", name: post.fuente_medio } }
              : {}),
          },
        }
      : {}),
  };
}

/**
 * The site itself.
 *
 * Name, url, description, language — and nothing else. No `SearchAction`,
 * because there is no search. The publisher's identity lives in the Person
 * node below, which the home emits alongside this one.
 */
export function websiteJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "es-ES",
  };
}

/**
 * The author as a resolvable entity: one node, on the home, tying the site to
 * the social profiles via `sameAs`.
 *
 * This is the cheapest entity-clarity lever in GEO: an answer engine that can
 * resolve "Kata Ivanovych" across LinkedIn/X/GitHub stops guessing whether the
 * name on an article is a person, a brand or a typo. It reads `siteConfig.social`
 * — the same list the footer renders — so a profile added there appears here
 * without a second edit, and the two can never disagree.
 *
 * Since 17-oct-2026 it is the node both sites share (`PERSONA`): the same @id,
 * name, `jobTitle` («Fundador de NBI», Katalin's choice, which ianexora.com
 * already published) and `sameAs` as on ianexora.com, which defines it.
 * `scripts/seo/check.mjs --compare` fails when the two disagree. No
 * `description`: each site words the bio its own way, and two different values
 * for the same property of one entity contradict each other. The footer links
 * every `sameAs` profile and the person's page (`url`).
 */
export function personJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: PERSONA.name,
    alternateName: PERSONA.alternateName,
    url: PERSONA.url,
    image: PERSONA.image,
    jobTitle: PERSONA.jobTitle,
    worksFor: { "@id": PERSONA.worksFor },
    sameAs: [...PERSONA.sameAs],
  };
}

/** A page's name and description, from the metadata it already exports: one source for both. */
export function datosDe(meta: { title?: unknown; description?: unknown }): { name: string; description: string } {
  const t = meta.title;
  const name =
    typeof t === "string"
      ? t
      : t && typeof t === "object" && "absolute" in t
        ? String((t as { absolute: string }).absolute)
        : siteConfig.name;
  return { name, description: typeof meta.description === "string" ? meta.description : "" };
}

/** The visible name of the archive (/blog), which the Blog node carries. */
export const TITULO_BLOG = "Lecturas";

type ItemDeLista = { name: string; url: string };
type Miga = { name: string; path: string };

/**
 * A listing page: `CollectionPage` (or the `Blog` itself, on /blog) whose
 * `mainEntity` is an `ItemList` of what the page shows, plus its breadcrumbs.
 * Every item is a link the visitor can follow on the page.
 */
export function coleccionJsonLd(pagina: {
  path: string;
  name: string;
  description: string;
  items: ItemDeLista[];
  migas?: Miga[];
  tipo?: "CollectionPage" | "Blog";
}): Json[] {
  const url = absoluta(pagina.path);
  const lista = {
    "@type": "ItemList",
    numberOfItems: pagina.items.length,
    itemListElement: pagina.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluta(item.url),
    })),
  };
  const nodo =
    pagina.tipo === "Blog"
      ? {
          "@context": "https://schema.org",
          "@type": "Blog",
          "@id": BLOG_ID,
          name: pagina.name,
          description: pagina.description,
          url,
          inLanguage: "es-ES",
          isPartOf: { "@id": WEBSITE_ID },
          author: personRef(),
          mainEntity: lista,
        }
      : {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": `${url}#webpage`,
          name: pagina.name,
          description: pagina.description,
          url,
          inLanguage: "es-ES",
          isPartOf: { "@id": WEBSITE_ID },
          mainEntity: lista,
        };
  return [nodo, breadcrumbJsonLd(pagina.migas ?? [{ name: "Inicio", path: "/" }, { name: pagina.name, path: pagina.path }])];
}

/** A page that is neither a listing nor an article (legal texts, a tool, a form), with its breadcrumbs. */
export function paginaJsonLd(pagina: { path: string; name: string; description: string; migas?: Miga[] }): Json[] {
  const url = absoluta(pagina.path);
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      name: pagina.name,
      description: pagina.description,
      url,
      inLanguage: "es-ES",
      isPartOf: { "@id": WEBSITE_ID },
    },
    breadcrumbJsonLd(pagina.migas ?? [{ name: "Inicio", path: "/" }, { name: pagina.name, path: pagina.path }]),
  ];
}

/**
 * /sobre-mi: a `ProfilePage` whose `mainEntity` is the shared Person, with its
 * own url (until 17-oct-2026 the page only had the Person, pointing at the home).
 */
export function perfilJsonLd(pagina: { path: string; name: string; description: string }): Json[] {
  const url = absoluta(pagina.path);
  return [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "@id": `${url}#webpage`,
      name: pagina.name,
      description: pagina.description,
      url,
      inLanguage: "es-ES",
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: { "@id": PERSON_ID },
    },
    personJsonLd(),
    breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: pagina.name, path: pagina.path }]),
  ];
}

/** Breadcrumbs. `path` values are site-relative and absolutised here. */
export function breadcrumbJsonLd(
  trail: { name: string; path: string }[],
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: `${siteConfig.url}${step.path}`,
    })),
  };
}

/**
 * A glossary entry is a DefinedTerm, which is what it actually is — a named
 * concept with a definition, part of a set. Unlike FAQPage this needs no
 * invention: the data already exists in src/lib/glossary.ts.
 */
export function definedTermJsonLd(entry: {
  id: string;
  title: string;
  def: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${siteConfig.url}/glosario/${entry.id}`,
    name: entry.title,
    description: entry.def,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Glosario de IA",
      url: `${siteConfig.url}/glosario`,
    },
  };
}

/**
 * An installable asset of the catalogue. `SoftwareSourceCode` is the type for
 * source someone reads and runs — which is what a skill is: a file of
 * instructions in a public repository. Everything here is on the page too:
 * the repository, the version, the licence, the author.
 */
export function softwareSourceCodeJsonLd(activo: {
  nombre: string;
  descripcion: string;
  /** Site-relative path of the asset's page. */
  path: string;
  codeRepository: string;
  version: string;
  publicado: string;
  /** SPDX identifier. */
  licencia: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: activo.nombre,
    description: activo.descripcion,
    url: `${siteConfig.url}${activo.path}`,
    codeRepository: activo.codeRepository,
    programmingLanguage: "Markdown",
    version: activo.version,
    datePublished: activo.publicado,
    license: `https://spdx.org/licenses/${activo.licencia}.html`,
    inLanguage: "es-ES",
    author: personRef(),
  };
}

/**
 * FAQPage. Only for a block the reader can see, with the same words.
 * Callers: the newsletter archive and the articles that declare `faq` in their
 * frontmatter (src/components/blog/faq.tsx paints that block).
 */
export function faqJsonLd(items: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
