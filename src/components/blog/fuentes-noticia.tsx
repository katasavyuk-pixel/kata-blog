import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/posts";
import { etiquetaIa } from "@/config/noticias";

const linkClass =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

/**
 * The source box of a lead news article: who reported it, where, when, and
 * the sources the text leans on. Rendered from the frontmatter that the build
 * and scripts/radar/article-gate.mjs already validate, so what is shown here
 * cannot differ from what was verified. Renders nothing for any other post.
 */
export function FuentesNoticia({ post }: { post: Post }) {
  if (!post.protagonista || !post.fuente_url || !post.fuente_medio) return null;

  return (
    <aside
      aria-labelledby="fuentes-noticia"
      className="mt-8 border border-border bg-surface px-5 py-4 font-sans text-[0.9375rem]"
    >
      <h2 id="fuentes-noticia" className="font-sans text-[0.9375rem] font-bold tracking-normal text-fg">
        Fuente
      </h2>
      <p className="mt-1.5 leading-snug">
        <a href={post.fuente_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {post.fuente_titulo ?? post.fuente_url}
        </a>
        <span className="text-muted">
          {" "}
          · {post.fuente_medio}
          {post.fuente_fecha ? <> · {formatDate(post.fuente_fecha)}</> : null}
        </span>
      </p>
      {post.fuentes_apoyo.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-muted">
          {post.fuentes_apoyo.map((url) => (
            <li key={url} className="break-words">
              <a href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {url}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-[0.8125rem] text-muted">
        {etiquetaIa(post) ? <>{etiquetaIa(post)}. </> : null}Texto redactado a partir de la
        fuente; no es una traducción ni una copia.
      </p>
    </aside>
  );
}
