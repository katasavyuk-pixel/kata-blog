/**
 * Copy for the in-body subscription call to action.
 *
 * Resolution order: what the article declares in its frontmatter → the shared
 * promise with a hook per `formato`. The hook exists so an article that never
 * sets `cta_inline` still says something specific: a generic "suscríbete a la
 * newsletter" in the middle of a lesson is an interruption with nothing offered
 * in return, which is worse than no form at all.
 *
 * The promise has to be one this site keeps. `siteConfig.newsletter` is the
 * baseline claim and is checked elsewhere; anything added here must stay true
 * without a new deliverable behind it.
 */

import type { Post } from "@/lib/posts";

export type CtaInline = { gancho: string; promesa: string };

/**
 * One promise, the same one the home and the welcome sequence make. Only the
 * hook changes with the format: it says what the reader has just finished.
 */
const PROMESA =
  "Te escribo con lo importante de la semana: el siguiente sistema que pongo en marcha, con sus números y lo que se rompió, o lo que ha pasado en la IA y te afecta. Como mucho, un correo a la semana.";

const GANCHO_POR_FORMATO: Record<string, string> = {
  sistema: "Este sistema está funcionando ahora mismo",
  caso: "El caso completo, también lo que no salió",
  leccion: "Esto es la base. Lo siguiente es verlo funcionando",
  herramienta: "Hay más como esta",
  radar: "Estas noticias las publica un sistema, no yo",
};

const GANCHO_POR_DEFECTO = "Lo que escribo sale de sistemas que funcionan";

export function ctaInlineFor(post: Post): CtaInline {
  return (
    post.cta_inline ?? {
      gancho: GANCHO_POR_FORMATO[post.formato] ?? GANCHO_POR_DEFECTO,
      promesa: PROMESA,
    }
  );
}
