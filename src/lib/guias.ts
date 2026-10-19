import type { Post } from "@/lib/posts";

/**
 * What makes a post a guide and not a note with a different label.
 *
 * A guide exists to answer something people type into a search box or ask an
 * assistant, so it has to be findable and quotable: a title written for the
 * query, at least one heading phrased as the question, the questions around it
 * answered in the open, and a primary source for what it states. All four can
 * be checked, which is why they are the definition and not a style note.
 *
 * Pure, over the compiled post: tests/guias.test.ts runs it over every
 * published guide, so a guide missing one of them fails `npm run verify`.
 */

/** The fewest questions that make an FAQ worth marking up as one. */
export const FAQ_MIN = 3;

/** Hosts that are the author's own: linking them is not citing a source. */
const PROPIOS = /(^|\.)ianexora\.com$/;

/** Every external URL the body links, in order. Compiled MDX keeps them as `href: "…"`. */
export function enlacesExternos(post: Pick<Post, "content">): string[] {
  return [...post.content.matchAll(/href:\s*"(https?:\/\/[^"]+)"/g)]
    .map(([, url]) => url)
    .filter((url) => {
      try {
        return !PROPIOS.test(new URL(url).hostname);
      } catch {
        return false;
      }
    });
}

const esPregunta = (texto: string) => /^¿.+\?$/.test(texto.trim());

export function erroresDeGuia(
  post: Pick<Post, "slug" | "seoTitle" | "toc" | "faq" | "content">,
): string[] {
  const errores: string[] = [];
  if (!post.seoTitle?.trim()) {
    errores.push("falta `seoTitle`: el título con las palabras de la búsqueda (máx. 60).");
  }
  if (!post.toc.some((heading) => esPregunta(heading.title))) {
    errores.push("ningún apartado (##) está escrito como la pregunta que responde.");
  }
  if (post.faq.length < FAQ_MIN) {
    errores.push(`tiene ${post.faq.length} preguntas frecuentes y hacen falta al menos ${FAQ_MIN}.`);
  }
  if (enlacesExternos(post).length === 0) {
    errores.push("no enlaza ninguna fuente externa: lo que afirma una guía lleva de dónde sale.");
  }
  return errores;
}
