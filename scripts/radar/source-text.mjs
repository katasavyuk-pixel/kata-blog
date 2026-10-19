/**
 * Source text — extraction and sufficiency gate for the daily lead article.
 *
 * A long article may only be written from a source whose full text we actually
 * hold. An RSS summary or a paywall teaser is not that: writing 600 words from
 * two sentences is exactly how invented detail gets in. This module decides,
 * deterministically and without a model, whether a candidate has enough text.
 * No dependencies on purpose: collect.mjs, the article gate and the tests all
 * import it as plain Node.
 */

/** Below this many words the source cannot carry a full article. */
export const MIN_SOURCE_WORDS = 350;
/** Distinct paragraphs of real prose; a wall of one line is a teaser or a list. */
export const MIN_SOURCE_PARAGRAPHS = 4;

const PAYWALL_MARKERS = [
  /subscribe to (continue|read)/i,
  /sign in to (continue|read)/i,
  /suscr[ií]bete para (seguir|continuar|leer)/i,
  /this (article|content) is (only )?(available|reserved) (to|for) (subscribers|members)/i,
  /already a subscriber\?/i,
  /to continue reading/i,
];

const NAMED_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decode(text) {
  return text
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => NAMED_ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(Number(c)))
    .replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCodePoint(parseInt(c, 16)));
}

export function countWords(text) {
  return (String(text ?? "").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
}

/** Visible blocks of an HTML fragment, one entry per element. */
function blocksOf(html) {
  return [...html.matchAll(/<(p|li|h[1-4]|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(([, tag, inner]) => ({
      tag: tag.toLowerCase(),
      text: decode(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(),
    }))
    .filter(({ text }) => text.length > 0);
}

/**
 * Main body text of an HTML page or a feed `content:encoded` fragment.
 * Prefers <article>, then <main>, then the whole document; scripts, styles,
 * navigation and footers are dropped first. Only paragraphs of 8+ words count
 * as prose, so menus, captions and link lists do not inflate the total.
 *
 * @returns {{ text: string, words: number, paragraphs: number, paywall: boolean }}
 */
export function extractArticleText(html) {
  const source = String(html ?? "");
  const stripped = source
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|figure)\b[\s\S]*?<\/\1>/gi, " ");
  const scope =
    stripped.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ??
    stripped.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ??
    stripped;
  const prose = blocksOf(scope).filter(({ tag, text }) => tag !== "li" && countWords(text) >= 8);
  const text = prose.map((block) => block.text).join("\n\n");
  return {
    text,
    words: countWords(text),
    paragraphs: prose.length,
    paywall: PAYWALL_MARKERS.some((re) => re.test(decode(scope.replace(/<[^>]+>/g, " ")))),
  };
}

/**
 * @param {{ words: number, paragraphs: number, paywall: boolean } | null | undefined} extracted
 * @returns {{ sufficient: boolean, reason: string }}
 */
export function assessSourceText(extracted) {
  if (!extracted || extracted.words === 0) return { sufficient: false, reason: "no-text" };
  if (extracted.paywall && extracted.words < MIN_SOURCE_WORDS * 2) {
    return { sufficient: false, reason: "paywall" };
  }
  if (extracted.words < MIN_SOURCE_WORDS) return { sufficient: false, reason: "too-short" };
  if (extracted.paragraphs < MIN_SOURCE_PARAGRAPHS) {
    return { sufficient: false, reason: "too-few-paragraphs" };
  }
  return { sufficient: true, reason: "ok" };
}
