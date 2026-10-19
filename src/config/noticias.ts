/**
 * Thresholds of the daily lead article that both the build and the pipeline
 * enforce. The pipeline copy lives in scripts/radar/source-text.mjs (plain Node,
 * no TS); tests/noticias-articulo.test.ts fails if the two drift apart.
 */

/** A source with fewer words than this cannot back a full article. */
export const MIN_SOURCE_WORDS = 350;

/**
 * How an automated piece says what it is, in the same words everywhere it
 * appears: the article's byline, /noticias, the home strip, the source box and
 * the feed. One literal so the disclosure cannot be reworded softer in one of
 * them. The EU AI Act (art. 50.4) asks that AI-generated text informing the
 * public be disclosed unless a person reviewed it and takes editorial
 * responsibility — which is what `revisado` records. How the article applies
 * to this site is still an open question for an adviser; saying plainly what the text is does
 * not depend on the answer.
 *
 * No imports here: velite.config.ts reads this file by relative path.
 */
export const ETIQUETA_IA = "Resumen con IA";

/** What signs an automated piece instead of the author's name. */
export const FIRMA_AUTOMATICA = "Noticias en automático";

/** Where the method is explained. Every automated byline links here. */
export const COMO_SE_HACE_HREF = "/noticias#como-se-hace";

/**
 * The label a piece carries, or none once a person has reviewed it: from
 * then on Kata takes editorial responsibility, which is the art. 50.4
 * exception. Kata chose on 2026-10-17 a short, quiet label over the old
 * «Generado con IA, sin revisión humana» in amber, and no label at all for
 * what he has read.
 */
export function etiquetaIa(post: { revisado: boolean }): string | null {
  return post.revisado ? null : ETIQUETA_IA;
}
