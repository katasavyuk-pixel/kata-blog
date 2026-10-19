import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, defineCollection, s } from "velite";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { transformerNotationDiff } from "@shikijs/transformers";
// Relative, not "@/": velite compiles this config in its own esbuild pass and
// does not read the tsconfig path aliases.
import { FORMATO_KEYS, SECCION_KEYS, TEMA_KEYS } from "./src/config/taxonomy";
import { MIN_SOURCE_WORDS } from "./src/config/noticias";
import { ENLACE_BITACORA, PROYECTO_KEYS, TIPO_ENTRADA_KEYS } from "./src/config/bitacora";
import { perspectivasDe } from "./src/lib/impacto";
import { parseNovedades } from "./src/lib/novedades";

const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/*.mdx",
  schema: s
    .object({
      title: s.string().max(120),
      // What the browser tab and the search result show, when the H1 is written
      // for a reader and not for the query. It replaces the whole <title>
      // (`title.absolute`), so it has all 60 characters and must carry the
      // site name itself if it wants one. src/lib/seo.ts.
      seoTitle: s.string().max(60).optional(),
      description: s.string().max(300),
      kicker: s.string().max(40).optional(), // small-caps category label (magazine header)
      dek: s.string().max(300).optional(), // standfirst / intro under the headline
      // The short answer under the h1 and the three things a reader takes away
      // (2026-10-14 redesign, «conclusión primero»). Both written by the author
      // of the piece, never generated: a piece without them shows its `dek`
      // in that place and no list.
      respuesta: s.string().max(320).optional(),
      te_llevas: s.array(s.string().max(160)).max(3).default([]),
      date: s.isodate(),
      updated: s.isodate().optional(),
      // Closed vocabulary, both required: a mistyped tema fails the build rather
      // than creating a category of one. Free `tags` stay as secondary keywords.
      tema: s.enum(TEMA_KEYS),
      formato: s.enum(FORMATO_KEYS),
      seccion: s.enum(SECCION_KEYS),
      nbiRelacionado: s.boolean().default(false),
      tags: s.array(s.string()).default([]),
      cover: s.image({ absoluteRoot: `${process.cwd()}/public` }).optional(),
      coverAlt: s.string().max(180).optional(),
      youtubeId: s.string().max(20).optional(), // companion YouTube video ID, if any
      // Slug of the `resources` row this article hands over, if any. When set,
      // the in-body ask becomes the delivery: one form, on the page the reader
      // is already on, instead of sending them to /recursos to give the same
      // address to the same list a second time.
      recurso: s.string().max(80).optional(),
      // Contextual copy for the in-body <SuscripcionInline/>. Optional: without
      // it the component falls back per `formato` (src/config/cta-inline.ts), so
      // an article never shows a generic ask.
      cta_inline: s
        .object({
          gancho: s.string().max(120),
          promesa: s.string().max(220),
        })
        .optional(),
      // Daily lead article of /noticias (`noticia-AAAA-MM-DD`). Flat scalars on
      // purpose: scripts/radar/article-gate.mjs reads the same fields without a
      // YAML parser. The `.refine` below makes the build fail if a lead article
      // lacks its source metadata, whatever wrote it.
      protagonista: s.boolean().default(false),
      impacto_interactivo: s.boolean().default(false),
      relevancia: s.enum(["ia", "trabajo", "negocio", "economia"]).optional(),
      fuente_titulo: s.string().max(300).optional(),
      fuente_url: s.string().url().optional(),
      fuente_medio: s.string().max(80).optional(),
      fuente_fecha: s.isodate().optional(),
      fuente_palabras: s.number().int().optional(),
      fuentes_apoyo: s.array(s.string().url()).default([]),
      // An automated piece (`formato: radar`) that a person has read and signed
      // off. Only then does it enter the index and the sitemap (`esIndexable`,
      // src/lib/posts.ts). Set by hand: the pipeline strips it and both gates
      // reject it, so the writing model can never claim a review that did not
      // happen.
      revisado: s.boolean().default(false),
      // Questions a reader actually asks, answered in plain text. The page shows
      // them as written and emits the same words as FAQPage (src/lib/jsonld.ts).
      faq: s
        .array(s.object({ q: s.string().max(160), a: s.string().max(600) }))
        .default([]),
      // How a hand-written piece connects to the rest of the site, declared once
      // and here: `a_raiz_de` names the posts (usually news) that prompted it,
      // `se_resuelve_con` the catalogue items (ids of config/library.ts) that
      // deal with it. The inverse links are derived, never written
      // (src/lib/relaciones.ts), and a reference to something that does not
      // exist fails the build there.
      a_raiz_de: s.array(s.string().max(80)).default([]),
      se_resuelve_con: s.array(s.string().max(80)).default([]),
      draft: s.boolean().default(false),
      premium: s.boolean().default(false),
      path: s.path(),
      toc: s.toc(),
      metadata: s.metadata(), // { readingTime, wordCount }
      excerpt: s.excerpt(),
      content: s.mdx(),
      // The source text, only so the transform below can read two things out
      // of it. It is dropped there: nothing ships the raw file.
      raw: s.raw(),
    })
    .refine(
      (data) => data.draft || data.premium || Boolean(data.cover),
      { message: "Published posts need a cover image", path: ["cover"] },
    )
    .refine(
      (data) => !data.cover || Boolean(data.coverAlt?.trim()),
      { message: "A cover image needs alternative text", path: ["coverAlt"] },
    )
    .refine(
      (data) =>
        !data.protagonista ||
        Boolean(
          data.relevancia &&
            data.fuente_titulo?.trim() &&
            data.fuente_medio?.trim() &&
            data.fuente_url?.startsWith("https://") &&
            data.fuente_fecha &&
            (data.fuente_palabras ?? 0) >= MIN_SOURCE_WORDS &&
            data.formato === "radar",
        ),
      {
        message:
          "A lead article needs relevancia, an https fuente_url, fuente_titulo, fuente_medio, fuente_fecha and fuente_palabras >= MIN_SOURCE_WORDS",
        path: ["protagonista"],
      },
    )
    .refine(
      (data) => !data.protagonista || data.impacto_interactivo,
      {
        message: "A lead article needs the interactive impact explorer",
        path: ["impacto_interactivo"],
      },
    )
    .transform(({ raw, ...data }) => {
      const slug = data.path.replace(/^posts\//, "");
      const automatico = data.formato === "radar";
      return {
        ...data,
        slug,
        permalink: `/blog/${slug}`,
        // What a news piece carries in its body rather than in its frontmatter,
        // read here so a page never has to open the file: the home revalidates
        // at runtime, where content/posts is not guaranteed to exist. Same
        // readers as the gates (src/lib/novedades.ts, src/lib/impacto.ts).
        novedades: automatico && !data.protagonista ? parseNovedades(raw) : [],
        lecturas: automatico && data.protagonista ? perspectivasDe(raw) : null,
      };
    }),
});

/**
 * Newsletter issues. Plain markdown, not MDX: this renders into an email, where
 * interactive widgets cannot run and `s.markdown()` gives us the HTML string an
 * email client actually needs.
 *
 * An issue is a file so it is versioned, reviewable in a PR and diffable —
 * the same contract as a post. `issue` is the idempotency key: the broadcast
 * refuses to send one twice.
 *
 * Two flags, two different checkpoints:
 * - `draft` (default true) — editorial: ready to send, or not yet.
 * - `sent` (default false) — historical: the broadcast actually went out. It is
 *   flipped by hand in the same session as the send, and it is what gates the
 *   public web archive (/newsletter): subscribers are promised the edition
 *   "antes que nadie", so an approved-but-unsent issue must not be readable on
 *   the open web. Same file-as-contract pattern as `draft`, pointing the other
 *   way.
 */
/** A picture already in public/, with the words for whoever cannot see it. */
const imagenDeEdicion = s
  .object({
    src: s.string().regex(/^\/[\w./-]+\.(webp|jpe?g|png)$/, "src: una ruta dentro de public/, como /covers/x.webp"),
    alt: s.string().max(180),
  })
  .refine(({ src }) => existsSync(join(process.cwd(), "public", src)), {
    message: "Esa imagen no está en public/",
  });

/** A page of this site ("/...") or a public address ("https://..."). */
const enlaceDeEdicion = s.string().regex(ENLACE_BITACORA, "una página del sitio (/...) o una URL pública (https://...)");

const newsletters = defineCollection({
  name: "NewsletterIssue",
  pattern: "newsletters/**/*.md",
  schema: s
    .object({
      issue: s.string().max(60), // stable id, never reuse
      subject: s.string().max(120),
      preheader: s.string().max(200),
      // The archive page's meta description when the preheader, written for
      // an inbox, is too short for a search result (120-155 is the target).
      descripcion: s.string().max(160).optional(),
      title: s.string().max(120),
      date: s.isodate(),
      // `semanal` is the weekly edition: the week's verified news, read and
      // signed by a person, with the days it covers in `semana`. It starts as a
      // draft written by scripts/radar/weekly-draft.ts and, once sent, is what
      // the monthly page (/noticias/<mes>) is built from.
      tipo: s.enum(["sistema", "semanal"]).default("sistema"),
      semana: s.object({ desde: s.isodate(), hasta: s.isodate() }).optional(),
      draft: s.boolean().default(true), // opt IN to sending, never out
      sent: s.boolean().default(false), // flipped after the real broadcast
      // The short visual edition (2026-10-15, Kata chose both «N1» and «N2»).
      // All optional: an issue without them is its body and nothing else. In
      // the email the pictures go as JPEG crops and the sequence as a GIF, both
      // made by `npm run correo` (src/lib/correo.ts says where).
      // N1, one system in a minute: a photo, three points, the sequence
      // animated, a button.
      imagen: imagenDeEdicion.optional(),
      minuto: s.array(s.string().max(220)).min(1).max(3).optional(),
      secuencia: s
        .object({
          titulo: s.string().max(80),
          pasos: s
            .array(
              s.object({
                titulo: s.string().max(16),
                detalle: s.string().max(24),
                // What broke at this step, if anything. Shown with a ✕.
                fallo: s.string().max(40).optional(),
              }),
            )
            .min(2)
            .max(5),
          // The whole diagram in words: it is an image in the email.
          alt: s.string().max(300),
        })
        .optional(),
      boton: s.object({ texto: s.string().max(40), url: enlaceDeEdicion }).optional(),
      // N2, the weekly «parte»: the one thing that matters this week, what I
      // built (from /bitacora) and a skill to use.
      construido: s
        .array(
          s.object({
            titulo: s.string().max(140),
            url: enlaceDeEdicion,
            frase: s.string().max(300),
            fecha: s.isodate(),
            tipo: s.enum(TIPO_ENTRADA_KEYS),
            proyecto: s.enum(PROYECTO_KEYS),
            imagen: imagenDeEdicion.optional(),
          }),
        )
        .max(3)
        .optional(),
      // «Lo importante de esta semana» (2026-10-16): the one thing, Kata's or the
      // world's. The text is the body's section of that name; this is its card.
      importante: s
        .object({
          titulo: s.string().max(200),
          url: enlaceDeEdicion.optional(),
          // The outlet, when it is news: «Leer la noticia · <fuente>».
          fuente: s.string().max(60).optional(),
          // The link's words when it is not news (default «Saber más»).
          rotulo: s.string().max(60).optional(),
          imagen: imagenDeEdicion.optional(),
        })
        .optional(),
      // An id of the marketplace (tests/newsletter-edicion.test.ts checks it exists).
      skill: s.string().max(40).optional(),
      // Both: the one question at the end, answered with a line.
      pregunta: s.string().max(300).optional(),
      path: s.path(),
      html: s.markdown(),
    })
    .refine((data) => data.tipo !== "semanal" || Boolean(data.semana), {
      message: "A weekly edition says which days it covers (semana: desde, hasta)",
      path: ["semana"],
    })
    .transform((data) => {
      const slug = data.path.replace(/^newsletters\//, "");
      return { ...data, slug, permalink: `/newsletter/${slug}` };
    }),
});

/**
 * Onboarding sequence emails. Same reasoning as `newsletters`: plain markdown,
 * because it renders into an email and `s.markdown()` gives the HTML string a
 * mail client needs.
 *
 * The point of putting these in files is that the copy is editable without
 * touching TypeScript — it used to live as JSX inside src/emails, where changing
 * a sentence meant editing a component. `draft` defaults to false here (unlike
 * an issue): a step that exists is part of the sequence, and the risk being
 * guarded against is the opposite one — silently dropping a step.
 *
 * `delayHours` is capped at 30 days because that is Resend's `scheduledAt`
 * horizon. A longer delay would be accepted here and then silently rejected at
 * send time, which is the worst place to find out.
 */
const sequenceEmails = defineCollection({
  name: "SequenceEmail",
  pattern: "emails/**/*.md",
  schema: s.object({
    key: s.string().max(40), // stable id stored in scheduled_emails.email_key
    sequence: s.string().max(40).default("bienvenida"),
    order: s.number().int().min(0),
    delayHours: s.number().int().min(0).max(24 * 30),
    subject: s.string().max(120),
    preheader: s.string().max(200),
    title: s.string().max(120),
    draft: s.boolean().default(false),
    // `copyLinkedFiles: false` because links here start with the `{{url_sitio}}`
    // placeholder, and Velite would otherwise read them as relative paths and
    // fail trying to open content/emails/%7B%7Burl_sitio%7D%7D/... The
    // placeholder is what keeps the domain out of the copy: it resolves from
    // siteConfig, which honours NEXT_PUBLIC_SITE_URL. (The newsletter issues
    // hardcode the production domain instead — worth fixing, separately.)
    html: s.markdown({ copyLinkedFiles: false }),
  }),
});

/**
 * The build log (/bitacora): one short file per thing shipped. `enlace` is
 * required and has to be a page of this site or a public URL: an entry that
 * cannot point at its proof does not go in, the same rule as `Evidencia`.
 * tests/bitacora.test.ts checks that every internal link resolves.
 */
const bitacora = defineCollection({
  name: "EntradaBitacora",
  pattern: "bitacora/**/*.md",
  schema: s
    .object({
      titulo: s.string().max(110),
      fecha: s.isodate(),
      proyecto: s.enum(PROYECTO_KEYS),
      tipo: s.enum(TIPO_ENTRADA_KEYS),
      enlace: s.string().regex(ENLACE_BITACORA, "enlace: una página del sitio (/...) o una URL pública (https://...)"),
      youtubeId: s.string().max(20).optional(),
      draft: s.boolean().default(false),
      path: s.path(),
      html: s.markdown(),
    })
    .transform((data) => {
      const slug = data.path.replace(/^bitacora\//, "");
      return { ...data, slug, permalink: `/bitacora#${slug}` };
    }),
});

export default defineConfig({
  root: "content",
  collections: { posts, newsletters, sequenceEmails, bitacora },
  mdx: {
    rehypePlugins: [
      rehypeSlug,
      [
        rehypePrettyCode,
        {
          // Light theme to match the paper page (2026-10-14 redesign). Code
          // surface styled in globals.css.
          theme: "github-light",
          keepBackground: false,
          transformers: [transformerNotationDiff()],
        },
      ],
      [rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: ["heading-anchor"] } }],
    ],
    remarkPlugins: [remarkGfm],
  },
});
