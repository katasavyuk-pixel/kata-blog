/**
 * Edition gate — pure checks, no I/O besides the frontmatter helpers.
 *
 * The anti-hallucination rule of the daily edition, in one place: every
 * <RadarItem> must point at a URL the collector really fetched, and its title,
 * source and axis must be the candidate's own. `verify-edition.mjs` (the gate)
 * and `repair-edition.mjs` (the deterministic fix that runs before it) are thin
 * CLIs over the functions here, and tests/noticias-edicion.test.ts runs the same
 * functions, so the three negatives CLAUDE.md asks for — a rewritten title, an
 * invented URL, a changed source — cannot stop failing without a test failing.
 *
 * `editionErrors` returns problems; an empty array means it may be published.
 *
 * `titular` is the one attribute that is the writing model's own: a headline in
 * Spanish for the reader, next to the literal `title` that identifies the
 * source. It cannot be compared with anything, so it is held to what can be
 * checked (`titularProblems`): a length, and no figure that the source's own
 * title and summary do not carry. A headline that fails is not worth an
 * edition: the repair step drops it and the reader gets the literal title.
 */
import { radarFrontmatterErrors } from "./edition-frontmatter.mjs";

export const NO_ITEMS_MESSAGE =
  "No <RadarItem> found in the edition — nothing to verify, refusing to pass.";

/**
 * Fold typographic variants before comparing text attributes.
 *
 * The writing model retypes headlines and flattens U+2019 to a plain apostrophe,
 * so a verbatim !== read that as an invented title: the 27-jul and 3-ago
 * editions both died on a smart quote and never opened a PR. None of these
 * substitutions can turn one article into another, and identity still hangs on
 * the URL, which is compared verbatim.
 *
 * Escapes are spelled out on purpose — this file exists to compare exact
 * characters, and literal invisible ones are unreviewable.
 */
export const canonical = (value) =>
  typeof value === "string"
    ? value
        .normalize("NFC")
        .replace(/[‘’‚‛′]/g, "'") // single quotes, prime
        .replace(/[“”„‟″]/g, '"') // double quotes, double prime
        .replace(/[‐-―−]/g, "-") // hyphens, en/em dash, minus
        .replace(/…/g, "...") // ellipsis
        .replace(/[   ​]/g, " ") // nbsp, figure/narrow space, ZWSP
        .replace(/\s+/g, " ")
        .trim()
    : value;

// An opening tag, in one of two shapes. The first is what the repair step
// writes and what a careful model types: attributes with quoted values, where a
// value may contain ">" (a headline can). The second is anything else that
// starts like a tag and runs to the first ">": it still has to be found, so its
// URL can be checked, but nothing typed in it besides the URL is trusted.
const ITEM_TAG = /<RadarItem(?:((?:\s+[\w-]+="[^"]*")+)\s*>|\s+([\s\S]*?)>)/g;
const ITEM_START = /<RadarItem\b/g;

/**
 * A headline is somebody else's text: it can carry a double quote, an angle
 * bracket or an ampersand, and any of them written raw inside `title="…"` ends
 * the attribute (or the tag) early. Then neither reader sees the item and MDX
 * does not compile. So values are written as character references, which MDX
 * decodes on its own, and both readers decode them the same way.
 */
export const encodeAttribute = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** `&amp;` last, so an encoded `&quot;` in the source text survives the trip. */
export const decodeAttribute = (value) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/**
 * Value of one attribute of an opening tag. Anchored on whitespace, so a longer
 * attribute that merely ends in the same letters cannot answer for it.
 */
export function attribute(attrs, name) {
  const raw = attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
  return raw === undefined ? undefined : decodeAttribute(raw);
}

/**
 * The attributes of each <RadarItem …>, in document order. `titular` is there
 * only when the item has one, and never from a tag that is not well formed.
 */
export function parseRadarItems(mdx) {
  return [...mdx.matchAll(ITEM_TAG)].map(([, wellFormed, loose]) => {
    const attrs = wellFormed ?? loose;
    const titular = wellFormed ? attribute(wellFormed, "titular") : undefined;
    return {
      title: attribute(attrs, "title"),
      url: attribute(attrs, "url"),
      source: attribute(attrs, "source"),
      axis: attribute(attrs, "axis"),
      date: attribute(attrs, "date"),
      ...(titular === undefined ? {} : { titular }),
    };
  });
}

export const TITULAR_MAX = 140;

/** Figures as written, with the decimal comma folded into a point: "3,8" is "3.8". */
const figuresIn = (text) =>
  (String(text ?? "").match(/\d+(?:[.,]\d+)*/g) ?? []).map((figure) => figure.replace(/,/g, "."));

/**
 * What can be held against a headline the model wrote. An empty array means it
 * may stand in for the literal title on the page.
 *
 * The figure check is deliberately blunt: "1.5 billion" turned into "1.500
 * millones" fails it, and that headline is dropped. A converted figure nobody
 * checked is exactly where a made-up one would hide.
 */
export function titularProblems(titular, candidate) {
  const text = String(titular ?? "").trim();
  const problems = [];
  if (!text) problems.push("is empty");
  if (text.length > TITULAR_MAX) problems.push(`is ${text.length} characters long (max ${TITULAR_MAX})`);
  const known = new Set(figuresIn(`${candidate.title ?? ""} ${candidate.summary ?? ""}`));
  const invented = [...new Set(figuresIn(text).filter((figure) => !known.has(figure)))];
  if (invented.length > 0) {
    problems.push(`carries a figure the source's title and summary do not: ${invented.join(", ")}`);
  }
  return problems;
}

/** How many items the document opens: a tag no reader can parse still counts. */
export const countRadarItemTags = (mdx) => (mdx.match(ITEM_START) ?? []).length;

/** Problems of the items alone, against the candidates the collector saved. */
export function itemErrors(radarItems, candidates) {
  const byUrl = new Map(candidates.map((item) => [item.url, item]));
  const errors = [];
  for (const item of radarItems) {
    // The URL is the identity key: matched verbatim, never folded.
    const candidate = byUrl.get(item.url);
    if (!candidate) {
      errors.push(`URL not in candidates (possible hallucination): ${item.url}`);
      continue;
    }
    for (const field of ["title", "source", "axis"]) {
      if (canonical(item[field]) !== canonical(candidate[field])) {
        errors.push(
          `${field} altered for ${item.url}\n  expected: ${candidate[field]}\n  got:      ${item[field]}`,
        );
      }
    }
    if (item.titular !== undefined) {
      const problems = titularProblems(item.titular, candidate);
      if (problems.length > 0) {
        errors.push(`titular rejected for ${item.url}: ${problems.join("; ")}\n  got:      ${item.titular}`);
      }
    }
  }
  return errors;
}

/**
 * Everything that keeps an edition from being published. Frontmatter is checked
 * after the items and does not replace those comparisons: a rewritten title, an
 * invented URL or a changed source still fails on its own, even when seccion
 * and the cover are fine.
 */
export function editionErrors(mdx, candidates) {
  const radarItems = parseRadarItems(mdx);
  if (radarItems.length === 0) return [NO_ITEMS_MESSAGE];
  const opened = countRadarItemTags(mdx);
  const unread =
    opened === radarItems.length
      ? []
      : [`${opened} <RadarItem tags opened but only ${radarItems.length} could be read: an unread item would be published unverified`];
  return [...unread, ...itemErrors(radarItems, candidates), ...radarFrontmatterErrors(mdx)];
}

/**
 * Rewrite the opening tag of each <RadarItem> from the candidate its URL points
 * at. The writing model only has to get the URL right: title, source, axis and
 * date are never taken from what it typed, so a retyped headline, a missing
 * attribute or a quote inside a title cannot reach the gate. The prose inside
 * each item is left as written.
 *
 * `titular`, the model's own headline, is kept when the tag it came in was well
 * formed and it passes `titularProblems`; otherwise it is left out and
 * `titulares.dropped` says why, and the page shows the literal title.
 *
 * `unmatched` lists the URLs that are in no candidate: a real problem that no
 * repair can fix, so the caller refuses to publish.
 */
export function repairRadarItems(mdx, candidates) {
  const byUrl = new Map(candidates.map((item) => [item.url, item]));
  const unmatched = [];
  /** @type {{ kept: number, dropped: { url: string, titular: string, problems: string[] }[] }} */
  const titulares = { kept: 0, dropped: [] };
  let repaired = 0;

  const fixed = mdx.replace(ITEM_TAG, (original, wellFormed, loose) => {
    const attrs = wellFormed ?? loose;
    const url = attribute(attrs, "url");
    const candidate = url ? byUrl.get(url) : undefined;
    if (!candidate) {
      unmatched.push(url);
      return original;
    }

    let titular;
    if (wellFormed) {
      const typed = attribute(wellFormed, "titular");
      if (typed !== undefined) {
        const clean = typed.replace(/\s+/g, " ").trim();
        const problems = titularProblems(clean, candidate);
        if (problems.length === 0) titular = clean;
        else titulares.dropped.push({ url, titular: clean, problems });
      }
    } else if (/(?:^|\s)titular=/.test(loose)) {
      titulares.dropped.push({ url, titular: "", problems: ["the tag it came in was not well formed"] });
    }
    if (titular !== undefined) titulares.kept += 1;

    const date = candidate.publishedAt ? candidate.publishedAt.slice(0, 10) : (attribute(attrs, "date") ?? "");
    // One attribute per line, in the order the published editions already use.
    const rebuilt = [
      "<RadarItem",
      `  title="${encodeAttribute(candidate.title)}"`,
      `  source="${encodeAttribute(candidate.source)}"`,
      `  url="${encodeAttribute(candidate.url)}"`,
      `  date="${encodeAttribute(date)}"`,
      `  axis="${encodeAttribute(candidate.axis)}"`,
      ...(titular === undefined ? [] : [`  titular="${encodeAttribute(titular)}"`]),
      ">",
    ].join("\n");

    if (rebuilt !== original) repaired += 1;
    return rebuilt;
  });

  return { mdx: fixed, repaired, unmatched, titulares };
}
