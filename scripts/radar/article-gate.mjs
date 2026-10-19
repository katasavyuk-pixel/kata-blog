/**
 * Lead article gate — pure checks, no I/O besides the frontmatter helpers.
 *
 * The daily lead article (`protagonista: true`) is longer and more opinionated
 * than an edition item, so it gets its own gate on top of the edition one:
 *
 *  - metadata: the `fuente_*` frontmatter must match the real candidate that
 *    the collector fetched, and that candidate must have sufficient full text;
 *  - links: the body must link the primary source, and every external link must
 *    be https and come from the candidates (or declared `fuentes_apoyo`);
 *  - structure: what happened, context, why it matters, what is still unknown,
 *    and a closing question — in that order;
 *  - originality: when the source text is at hand, no long verbatim run and no
 *    heavy shingle overlap with it (we attribute the outlet, we do not copy it).
 *
 * `articleErrors` returns problems; an empty array means it may be published.
 * The same function runs in the workflow (verify-article.mjs) and in
 * tests/noticias-articulo.test.ts over the committed articles.
 */
import { fieldValue, relationErrors, splitFrontmatter } from "./edition-frontmatter.mjs";
import { MIN_SOURCE_WORDS, countWords } from "./source-text.mjs";
import fuentesConfig from "../../config/radar-sources.json" with { type: "json" };

// How each feed's publisher is named in running text: the `medio` that
// config/radar-sources.json keeps next to the feed label ("The Guardian AI" →
// "The Guardian"). The collector copies it onto each candidate as `outlet`;
// this map gives a committed article, checked without candidates, the same
// name to look for.
const MEDIO_DE_FEED = new Map(
  fuentesConfig.sources.filter((s) => s.medio).map((s) => [s.name, s.medio]),
);

export const MIN_ARTICLE_WORDS = 450;
export const MAX_VERBATIM_RUN = 25;
export const MAX_SHINGLE_OVERLAP = 0.12;
const SHINGLE = 8;

export const RELEVANCIAS = ["ia", "trabajo", "negocio", "economia"];

/** Required h2 sections, in order. Matched on the heading text, case-insensitive. */
export const REQUIRED_SECTIONS = [
  // `\b` is ASCII-centric in JavaScript and does not see accented `ó` as a
  // word character. Use an explicit separator so "Qué pasó" matches reliably.
  { key: "pasó", re: /^qu[eé]\s+pas[oó](?=$|[\s:.,!?])/i },
  { key: "contexto", re: /^contexto\b/i },
  { key: "importa", re: /^por qu[eé] importa\b/i },
  { key: "falta", re: /^qu[eé] falta por saber\b/i },
  { key: "pregunta", re: /^(la )?pregunta\b/i },
];

const canonical = (value) =>
  typeof value === "string"
    ? value
        .normalize("NFC")
        .replace(/[‘’‚‛′]/g, "'")
        .replace(/[“”„‟″]/g, '"')
        .replace(/[‐-―−]/g, "-")
        .replace(/…/g, "...")
        .replace(/\s+/g, " ")
        .trim()
    : value;

/** Items of a YAML block list under `key:` (`  - value`), quotes removed. */
export function listField(yaml, key) {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start === -1) return [];
  const out = [];
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^\s+-\s+(.*)$/);
    if (!match) break;
    out.push(match[1].trim().replace(/^["']|["']$/g, ""));
  }
  return out;
}

/** Is this MDX a lead article (as opposed to an edition)? */
export function isLeadArticle(mdx) {
  const parts = splitFrontmatter(mdx);
  return Boolean(parts && fieldValue(parts.yaml, "protagonista") === "true");
}

const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

function shingles(tokens) {
  const out = new Set();
  for (let i = 0; i + SHINGLE <= tokens.length; i += 1) out.add(tokens.slice(i, i + SHINGLE).join(" "));
  return out;
}

/** Longest run of consecutive words shared by `a` and `b` (token arrays). */
export function longestSharedRun(a, b) {
  const index = new Map();
  b.forEach((token, i) => {
    if (!index.has(token)) index.set(token, []);
    index.get(token).push(i);
  });
  let best = 0;
  // Dynamic programming over matching positions only: O(matches), not O(n*m).
  let previous = new Map();
  for (let i = 0; i < a.length; i += 1) {
    const current = new Map();
    for (const j of index.get(a[i]) ?? []) {
      const length = (previous.get(j - 1) ?? 0) + 1;
      current.set(j, length);
      if (length > best) best = length;
    }
    previous = current;
  }
  return best;
}

/** Share of the article's 8-grams that also appear in the source (0..1). */
export function shingleOverlap(articleText, sourceText) {
  const mine = shingles(words(articleText));
  if (mine.size === 0) return 0;
  const theirs = shingles(words(sourceText));
  let shared = 0;
  for (const s of mine) if (theirs.has(s)) shared += 1;
  return shared / mine.size;
}

/** Markdown body without frontmatter, JSX tags and the link targets. */
function plainBody(body) {
  return body
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>`]/g, " ");
}

function headings(body) {
  return [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
}

function sectionBody(body, headingRe) {
  const parts = body.split(/^##\s+/m).slice(1);
  const found = parts.find((part) => headingRe.test(part.split("\n", 1)[0].trim()));
  return found ? found.split("\n").slice(1).join("\n") : "";
}

/**
 * @param {string} mdx                      the lead article, raw
 * @param {{ candidates?: object[], sourceText?: string, requireImpactExplorer?: boolean, requireUnreviewed?: boolean }} [context]
 *   `candidates`: items of scratch/radar-candidates.json (enables the
 *   metadata-vs-reality checks). `sourceText`: the source's full text
 *   (enables the originality checks). `requireImpactExplorer` and
 *   `requireUnreviewed`: what only a freshly written article must meet — the
 *   workflow passes both, the check over committed articles neither.
 * @returns {string[]}
 */
export function articleErrors(
  mdx,
  { candidates, sourceText, requireImpactExplorer = false, requireUnreviewed = false } = {},
) {
  const parts = splitFrontmatter(mdx);
  if (!parts) return ["article has no YAML frontmatter"];
  const errors = [];
  const { yaml } = parts;
  const body = parts.after;
  let originalitySource = sourceText;

  // --- Frontmatter: identity and source metadata.
  if (fieldValue(yaml, "protagonista") !== "true") errors.push('frontmatter protagonista must be "true"');
  if (fieldValue(yaml, "formato") !== "radar") errors.push('frontmatter formato must be "radar"');
  if (fieldValue(yaml, "draft") !== "false") errors.push('frontmatter draft must be "false"');
  const hasImpactExplorer = fieldValue(yaml, "impacto_interactivo") === "true";
  if (requireImpactExplorer && !hasImpactExplorer) {
    errors.push('new lead articles must set impacto_interactivo: true');
  }
  // `revisado` indexes the article and says a person reviewed it. A person sets
  // it later, on the published file, which is why the committed articles are
  // checked without this option and the workflow always with it.
  if (requireUnreviewed && fieldValue(yaml, "revisado") === "true") {
    errors.push("frontmatter revisado cannot be true on a fresh article: only a person sets it, after reading it");
  }
  errors.push(...relationErrors(yaml));
  const relevancia = fieldValue(yaml, "relevancia");
  if (!RELEVANCIAS.includes(relevancia ?? "")) {
    errors.push(`frontmatter relevancia must be one of ${RELEVANCIAS.join(" | ")} (got: ${relevancia ?? "missing"})`);
  }

  const fuente = {
    titulo: fieldValue(yaml, "fuente_titulo"),
    url: fieldValue(yaml, "fuente_url"),
    medio: fieldValue(yaml, "fuente_medio"),
    fecha: fieldValue(yaml, "fuente_fecha"),
    palabras: Number(fieldValue(yaml, "fuente_palabras")),
  };
  for (const [key, value] of Object.entries(fuente)) {
    if (key === "palabras") continue;
    if (!value || !String(value).trim()) errors.push(`frontmatter fuente_${key === "titulo" ? "titulo" : key} is required`);
  }
  if (fuente.url) {
    let parsed = null;
    try {
      parsed = new URL(fuente.url);
    } catch {
      errors.push(`fuente_url is not a valid URL: ${fuente.url}`);
    }
    if (parsed && parsed.protocol !== "https:") errors.push(`fuente_url must be https: ${fuente.url}`);
  }
  if (!Number.isFinite(fuente.palabras) || fuente.palabras < MIN_SOURCE_WORDS) {
    errors.push(
      `fuente_palabras must be a number >= ${MIN_SOURCE_WORDS} (source text too short to back a full article; got: ${fieldValue(yaml, "fuente_palabras") ?? "missing"})`,
    );
  }

  const apoyo = listField(yaml, "fuentes_apoyo");
  for (const url of apoyo) {
    if (!/^https:\/\//.test(url)) errors.push(`fuentes_apoyo must be https URLs: ${url}`);
  }

  // `fuente_medio` is the feed's label ("The Guardian AI"); `outlet` is what a
  // person calls the publisher ("The Guardian"). Either one attributes it. The
  // outlet comes from the candidate in the workflow and from the config here,
  // so the test over committed articles accepts what the workflow accepted
  // (on 2026-10-14 it did not, and main's CI went red on a correct article).
  const attributions = new Set([fuente.medio, MEDIO_DE_FEED.get(fuente.medio)].filter(Boolean));

  // --- Metadata vs. the real candidate (verbatim URL, canonical text).
  if (candidates) {
    const byUrl = new Map(candidates.map((c) => [c.url, c]));
    const candidate = fuente.url ? byUrl.get(fuente.url) : undefined;
    if (candidate?.outlet) attributions.add(candidate.outlet);
    if (!candidate) {
      errors.push(`fuente_url not in candidates (possible hallucination): ${fuente.url}`);
    } else {
      if (canonical(candidate.title) !== canonical(fuente.titulo)) {
        errors.push(`fuente_titulo altered\n  expected: ${candidate.title}\n  got:      ${fuente.titulo}`);
      }
      if (canonical(candidate.source) !== canonical(fuente.medio)) {
        errors.push(`fuente_medio altered\n  expected: ${candidate.source}\n  got:      ${fuente.medio}`);
      }
      if (candidate.publishedAt && candidate.publishedAt.slice(0, 10) !== fuente.fecha) {
        errors.push(`fuente_fecha altered (expected ${candidate.publishedAt.slice(0, 10)}, got ${fuente.fecha})`);
      }
      if (candidate.textStatus?.sufficient !== true) {
        errors.push(`source has no sufficient full text (${candidate.textStatus?.reason ?? "unknown"}): no lead article allowed`);
      } else if (typeof candidate.text !== "string" || !candidate.text.trim()) {
        errors.push("candidate is marked sufficient but its full source text is missing");
      } else if (countWords(candidate.text) < MIN_SOURCE_WORDS) {
        errors.push(`candidate source text has fewer than ${MIN_SOURCE_WORDS} words`);
      } else if (countWords(candidate.text) !== candidate.textWords) {
        errors.push("candidate textWords does not match its collected source text");
      } else if (fuente.palabras !== candidate.textWords) {
        errors.push(`fuente_palabras (${fuente.palabras}) does not match the collected text (${candidate.textWords})`);
      } else {
        originalitySource ||= candidate.text;
      }
    }
    for (const url of apoyo) {
      if (!byUrl.has(url)) errors.push(`fuentes_apoyo url not in candidates: ${url}`);
    }
  }

  // --- Links: the source is linked and attributed; nothing else external is invented.
  const markdownLinks = [...body.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)].map((m) => ({ text: m[1], url: m[2] }));
  const htmlLinks = [...body.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi)].map((m) => ({ text: "", url: m[2] }));
  const links = [...markdownLinks, ...htmlLinks];
  const allowed = new Set([fuente.url, ...apoyo].filter(Boolean));
  if (fuente.url && !links.some((l) => l.url === fuente.url)) {
    errors.push("body must link the primary source (fuente_url) verbatim");
  }
  const prose = plainBody(body).toLowerCase();
  if (attributions.size > 0 && ![...attributions].some((name) => prose.includes(name.toLowerCase()))) {
    errors.push(`body must attribute the source by name (${[...attributions].join(" or ")})`);
  }
  for (const { url } of links) {
    if (/^[a-z][a-z\d+.-]*:/i.test(url) && !/^https:\/\//.test(url)) {
      errors.push(`external link must be https: ${url}`);
    } else if (/^https?:\/\//i.test(url) && !/^https:\/\//.test(url)) {
      errors.push(`external link must be https: ${url}`);
    } else if (/^https:\/\//i.test(url) && !allowed.has(url) && !(candidates ?? []).some((c) => c.url === url)) {
      errors.push(`external link not backed by a collected source: ${url}`);
    }
  }

  // --- Structure: required sections, in order; closing question.
  const found = headings(body);
  let cursor = -1;
  for (const section of REQUIRED_SECTIONS) {
    const at = found.findIndex((h, i) => i > cursor && section.re.test(h));
    if (at === -1) errors.push(`missing or out-of-order section: ${section.key}`);
    else cursor = at;
  }
  const closing = sectionBody(body, REQUIRED_SECTIONS[4].re).trim();
  if (!closing.includes("?")) errors.push('the closing section must pose a question ("?")');

  if (hasImpactExplorer || requireImpactExplorer) {
    const impactSection = sectionBody(body, REQUIRED_SECTIONS[2].re);
    const comparators = [...impactSection.matchAll(/<Comparador\b[\s\S]*?<\/Comparador>/g)];
    const lenses = [...impactSection.matchAll(/<Lado\s+titulo="([^"]+)"/g)].map((match) => match[1]);
    const expectedLenses = ["Dirección", "Operaciones", "Tecnología"];
    if (comparators.length !== 1) {
      errors.push(`impact explorer must contain exactly one <Comparador> in "Por qué importa" (got: ${comparators.length})`);
    }
    if (comparators.length === 1 && !/\bmodo="explorar"/.test(comparators[0][0])) {
      errors.push('impact explorer must use <Comparador modo="explorar"> so the reader can select a perspective');
    }
    for (const lens of expectedLenses) {
      if (!lenses.includes(lens)) errors.push(`impact explorer is missing the "${lens}" perspective`);
    }
    if (lenses.length !== expectedLenses.length) {
      errors.push(`impact explorer must contain exactly ${expectedLenses.length} perspectives (got: ${lenses.length})`);
    }
    if (comparators.length === 1 && lenses.length === expectedLenses.length) {
      const panelBodies = [...comparators[0][0].matchAll(/<Lado\s+titulo="[^"]+">([\s\S]*?)<\/Lado>/g)];
      for (const [index, panel] of panelBodies.entries()) {
        if (countWords(plainBody(panel[1])) < 18) {
          errors.push(`impact explorer perspective "${expectedLenses[index]}" needs at least 18 words`);
        }
      }
    }
  }

  // --- Length.
  const text = plainBody(body);
  const articleWords = countWords(text);
  if (articleWords < MIN_ARTICLE_WORDS) {
    errors.push(`article too short: ${articleWords} words (< ${MIN_ARTICLE_WORDS})`);
  }

  // --- Originality against the source text, when we have it.
  if (originalitySource) {
    const run = longestSharedRun(words(text), words(originalitySource));
    if (run > MAX_VERBATIM_RUN) errors.push(`copies ${run} consecutive words from the source (max ${MAX_VERBATIM_RUN})`);
    const overlap = shingleOverlap(text, originalitySource);
    if (overlap > MAX_SHINGLE_OVERLAP) {
      errors.push(`overlap with the source is ${(overlap * 100).toFixed(0)}% (max ${MAX_SHINGLE_OVERLAP * 100}%)`);
    }
  }

  return errors;
}

export const NOT_A_LEAD_MESSAGE =
  "Not a lead article (frontmatter protagonista: true is missing) — refusing to pass.";

/**
 * Everything a lead article has to pass right after it is written, with the
 * options the workflow always uses. verify-article.mjs (strict: exit 1) and
 * settle-lead.mjs (lenient: drops the article and lets the edition go out) both
 * call this, so the two cannot drift apart.
 */
export function freshLeadErrors(mdx, candidates) {
  if (!isLeadArticle(mdx)) return [NOT_A_LEAD_MESSAGE];
  const url = fieldValue(splitFrontmatter(mdx).yaml, "fuente_url");
  const sourceText = candidates.find((item) => item.url === url)?.text;
  return articleErrors(mdx, {
    candidates,
    sourceText,
    requireImpactExplorer: true,
    requireUnreviewed: true,
  });
}
