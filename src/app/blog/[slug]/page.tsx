import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { MDXContent } from "@/components/mdx/mdx-content";
import { widgets } from "@/components/mdx/widgets";
import { SuscripcionInline } from "@/components/mdx/widgets/suscripcion-inline";
import { YouTubeEmbed } from "@/components/mdx/widgets/youtube-embed";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { CopyCode } from "@/components/blog/copy-code";
import { ShareButtons } from "@/components/blog/share-buttons";
import { FuentesNoticia } from "@/components/blog/fuentes-noticia";
import { ArticleClosing } from "@/components/blog/article-closing";
import { Faq } from "@/components/blog/faq";
import { PuenteNbi } from "@/components/blog/puente-nbi";
import { PUENTE_POR_POST } from "@/config/puentes";
import { ARaizDe, DioLugarA, SeResuelveCon } from "@/components/blog/relaciones";
import { TagPill } from "@/components/content/tag-pill";
import { formatDate, formatDateShort } from "@/lib/format";
import { Ficha } from "@/components/sistema/ficha";
import { fichaForPost } from "@/lib/library";
import { CourseProgressMarker } from "@/components/course/course-progress-marker";
import { JsonLd } from "@/components/ui/json-ld";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, personJsonLd } from "@/lib/jsonld";
import { allPosts, esAutomatico, estanteDe, getPost, tienePaginaViva } from "@/lib/posts";
import { metadataDePost } from "@/lib/seo";
import { relacionesDe } from "@/lib/relaciones";
import { siteConfig } from "@/config/site";
import { COMO_SE_HACE_HREF, FIRMA_AUTOMATICA, etiquetaIa } from "@/config/noticias";
import { ESTANTES, FORMATOS, RUTA_POR_ESTANTE, tagHref } from "@/config/taxonomy";
import { COURSE_SLUGS } from "@/config/course";
import { ctaInlineFor } from "@/config/cta-inline";
import { NOMBRES_PIEZA } from "@/components/pieza";
import { RetratoMini } from "@/components/ui/retrato";

/** Compiled MDX names each component it renders; a word match is enough. */
const CON_PIEZA = new RegExp(`\\b(${NOMBRES_PIEZA.join("|")})\\b`);

export function generateStaticParams() {
  return allPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  return post ? metadataDePost(post) : {};
}

/**
 * The article, «conclusión primero» (redesign of 2026-10-14, chosen by Kata on
 * the Claude Design canvas). The reader gets the answer before the text: the
 * h1, the short answer and what they take away, the signature, and the first
 * paragraph inside a laptop screen. Everything that used to sit between the
 * dek and the body — cover, ficha, table of contents, a side rail — either
 * moved after the body or left the page, because it pushed the first sentence
 * below the fold (982 px down on a 1024×768 screen before this).
 */
export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const fullUrl = `${siteConfig.url}${post.permalink}`;
  // A piece hangs from the page of its shelf (RUTA_POR_ESTANTE): a system from
  // /sistemas, a lesson from the course, a news edition from /noticias — the
  // archive does not even list those. A shelf with no page of its own is a
  // filter of the archive, and so is one whose page is still empty.
  const estante = estanteDe(post);
  const parent = tienePaginaViva(estante)
    ? { name: ESTANTES[estante], path: RUTA_POR_ESTANTE[estante] }
    : { name: "Archivo", path: "/blog" };
  const relaciones = relacionesDe(post);
  // The system behind the article, when config/library declares one for this
  // slug. After the body now: the short answer carries the conclusion, the
  // ficha is the proof for whoever wants it.
  const ficha = fichaForPost(post.slug);
  const readingMinutes = Math.max(1, Math.round(post.metadata.readingTime));
  // The progress gauge earns its place on long reads and on essays with
  // pieces (which run long on screen even when the word count is short).
  const showProgress = readingMinutes >= 6 || CON_PIEZA.test(post.content);
  const automatico = esAutomatico(post);

  return (
    <Container className="pb-10 pt-8 sm:pb-16 sm:pt-11">
      {showProgress ? <ReadingProgress /> : null}
      {/* Article/TechArticle by `formato`, the Person node its author and
          publisher point at, the breadcrumb (machine-only: the format label
          links to the parent shelf) and the FAQ when the post declares one.
          Escaping lives in the component. */}
      <JsonLd
        data={[
          articleJsonLd(post),
          personJsonLd(),
          breadcrumbJsonLd([
            parent,
            { name: post.title, path: post.permalink },
          ]),
          ...(post.faq.length > 0 ? [faqJsonLd(post.faq)] : []),
        ]}
      />

      {/* One column. Header and body share a centred 66ch axis; interactive
          pieces may step out of it (`--breakout`, globals.css), which is why
          the column is wider than the text and a size container. */}
      <article className="article-column mx-auto min-w-0 max-w-[56rem]">
        <header className="mx-auto max-w-[66ch]">
          {/* Who signs it, what it is and when, on one line: the signature
              used to have a row of its own and kept the first paragraph below
              a laptop's fold. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-[0.9375rem] text-muted">
            {automatico ? (
              // No portrait and no name: nobody wrote this. What signs it is
              // the system, with the disclosure next to it and the method one
              // click away.
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={COMO_SE_HACE_HREF} className="text-fg underline decoration-border underline-offset-[0.18em] hover:text-accent-ink">
                  {FIRMA_AUTOMATICA}
                </Link>
                {etiquetaIa(post) ? <span className="text-[0.8125rem]">{etiquetaIa(post)}</span> : null}
              </span>
            ) : (
              <Link href="/sobre-mi" className="inline-flex items-center gap-2.5 font-semibold text-fg hover:text-accent-ink">
                <RetratoMini size={32} decorative />
                {siteConfig.author.name}
              </Link>
            )}
            <Link href={parent.path} className="font-semibold text-accent-ink hover:underline">
              {FORMATOS[post.formato]}
            </Link>
            {/* Date and reading time travel together, so on a phone the line
                wraps into two rows, not three. */}
            <span>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              {post.updated ? (
                <>
                  , actualizado el <time dateTime={post.updated}>{formatDateShort(post.updated)}</time>
                </>
              ) : null}
              <span aria-hidden> · </span>
              {readingMinutes} min de lectura
            </span>
          </div>
          <h1 className="mt-3 text-h1 font-medium tracking-[-0.018em]">{post.title}</h1>

          {post.respuesta ? (
            <section aria-labelledby="respuesta-corta" className="mt-8 border-t-[3px] border-accent pt-5">
              <h2 id="respuesta-corta" className="font-sans text-[0.75rem] font-bold uppercase tracking-[0.08em] text-accent-ink">
                La respuesta corta
              </h2>
              <p className="mt-2.5 text-lede">{post.respuesta}</p>
            </section>
          ) : (
            <p className="mt-6 text-lede text-muted">{post.dek ?? post.description}</p>
          )}

          {post.te_llevas.length > 0 ? (
            // The newsletter's «En un minuto» box (2026-10-15, Kata: «me gusta hasta para el
            // blog»): the same paper, label and list as src/components/newsletter/bloques.tsx.
            <section aria-labelledby="te-llevas" className="mt-6 bg-surface px-5 py-4 sm:px-6 sm:py-5">
              <h2 id="te-llevas" className="font-sans text-[0.75rem] font-bold uppercase tracking-[0.08em] text-fg">
                Lo que te llevas
              </h2>
              <ul className="mt-2.5 list-disc space-y-2 pl-5 font-sans text-[0.9375rem] leading-relaxed text-fg marker:text-accent sm:text-base">
                {post.te_llevas.map((linea) => (
                  <li key={linea} className="pl-1">
                    {linea}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </header>

        <div className="mx-auto max-w-[66ch]">
          <FuentesNoticia post={post} />
        </div>

        {post.youtubeId ? (
          <div className="mx-auto max-w-[66ch]">
            <YouTubeEmbed
              id={post.youtubeId}
              title={post.title}
              entregaAqui={Boolean(post.recurso)}
            />
          </div>
        ) : null}

        <div className="mt-8">
          <Prose className="mx-auto">
            {/* SuscripcionInline is bound to this post here because an MDX body
                cannot read its own frontmatter. Authors write a bare
                <SuscripcionInline /> and the contextual copy resolves from
                `cta_inline`, falling back per `formato`. */}
            <MDXContent
              code={post.content}
              components={{
                ...widgets,
                SuscripcionInline: () => (
                  <SuscripcionInline
                    {...ctaInlineFor(post)}
                    recurso={post.recurso}
                  />
                ),
              }}
            />
          </Prose>
        </div>

        <CopyCode />
        <div className="mx-auto max-w-[66ch]">
          {ficha ? (
            <div className="mt-14">
              <Ficha item={ficha} heading="h2" />
            </div>
          ) : null}
          <SeResuelveCon items={relaciones.seResuelveCon} />
          <ARaizDe posts={relaciones.aRaizDe} />
          <DioLugarA posts={relaciones.dioLugarA} />
          <Faq items={post.faq} />
          {PUENTE_POR_POST[post.slug] ? <PuenteNbi guia={PUENTE_POR_POST[post.slug]} campana={post.slug} /> : null}
          <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-border pt-6 font-sans">
            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <TagPill key={tag} tag={tag} href={tagHref(tag)} />
                ))}
              </div>
            ) : null}
            <ShareButtons url={fullUrl} title={post.title} />
          </div>
          <ArticleClosing post={post} />
        </div>
        {(COURSE_SLUGS as readonly string[]).includes(post.slug) ? (
          <CourseProgressMarker slug={post.slug} />
        ) : null}
      </article>
    </Container>
  );
}
