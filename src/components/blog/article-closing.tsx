import Link from "next/link";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { RelatedPosts } from "@/components/blog/related-posts";
import { CierreEstandar } from "@/components/blog/cierre-estandar";
import { AuthorBio, OrigenAutomatico } from "@/components/blog/author-bio";
import { siteConfig } from "@/config/site";
import { anclaDelFormulario, cuerpoConFormulario } from "@/lib/formularios";
import { esAutomatico, getRelatedPosts, type Post } from "@/lib/posts";

/**
 * One closing unit for authorship, a relevant next step, related reading and
 * the newsletter invitation. NBI only appears on articles marked as relevant.
 *
 * What changed (2026-08-05): the call to action used to be *chosen* by `formato`,
 * so a reader saw one of three different closings depending on which article they
 * landed on. That made the closing unmeasurable and unmemorable — nothing repeats,
 * so nothing gets learned. Now all three exits render every time and `formato`
 * only decides which one is emphasised (src/config/cierre.ts).
 *
 * The email field sits at the end of the article, after related reading: the
 * one form the page owns (`hasOwnSignupForm`) — unless the body already has
 * one (a daily edition, a piece that sends its result, the calculator in
 * capture mode). Then the closing points to it instead of asking twice
 * (src/lib/formularios.ts).
 */
export function ArticleClosing({ post }: { post: Post }) {
  const formularioArriba = cuerpoConFormulario(post);
  return (
    <>
      {esAutomatico(post) ? <OrigenAutomatico revisado={post.revisado} /> : <AuthorBio />}
      <CierreEstandar formato={post.formato} incluirNbi={post.nbiRelacionado} />
      <RelatedPosts posts={getRelatedPosts(post)} />
      <section
        aria-labelledby="article-newsletter"
        className="not-prose mt-14 border-t border-border pt-8 font-sans"
      >
        <p className="font-sans text-[0.8125rem] font-semibold text-accent-ink">La newsletter</p>
        <h2 id="article-newsletter" className="mt-3 max-w-[28ch] text-h2">
          {siteConfig.newsletter.title}
        </h2>
        <p className="mt-3 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted">
          {siteConfig.newsletter.description}
        </p>
        {formularioArriba ? (
          <p className="mt-5 text-[0.9375rem]">
            <a
              href={anclaDelFormulario(post)}
              className="font-semibold text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
            >
              Apuntarme con el formulario de más arriba
            </a>
          </p>
        ) : (
          <div className="mt-5 max-w-xl">
            <SubscribeForm
              source={`article-${post.slug}`}
              layout="stacked"
            />
          </div>
        )}
        <p className="mt-4 text-[0.9375rem]">
          <Link
            href="/newsletter"
            className="text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
          >
            Leer ediciones anteriores
          </Link>
        </p>
      </section>
    </>
  );
}
