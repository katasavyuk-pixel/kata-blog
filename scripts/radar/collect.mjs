/**
 * Noticias — deterministic RSS collector.
 *
 * Fetches every feed in config/radar-sources.json, keeps items from the last
 * `windowDays` days, dedupes, and writes scratch/radar-candidates.json.
 *
 * This step deliberately involves NO LLM: titles, URLs and dates come straight
 * from the feeds, which is what protects the generated post from hallucinated
 * sources. The writing step (Claude Code Action) may only pick from this file.
 *
 * Usage: node scripts/radar/collect.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { assessSourceText, extractArticleText } from "./source-text.mjs";
import { rankLeads } from "./lead-selection.mjs";

const CONFIG_PATH = new URL("../../config/radar-sources.json", import.meta.url);
const OUT_PATH = new URL("../../scratch/radar-candidates.json", import.meta.url);
const FETCH_TIMEOUT_MS = 10_000;
/** How many top-ranked candidates get their page fetched for full text. */
const FULL_TEXT_LOOKUPS = 8;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  htmlEntities: true, // decode &#038; etc. everywhere, URLs included
});

/** Drop tracking params (utm_*, fbclid) so links are clean and stable. */
function cleanUrl(url) {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "fbclid") u.searchParams.delete(key);
    }
    return u.toString().replace(/\?$/, "");
  } catch {
    return url;
  }
}

/** Strip HTML tags/entities and collapse whitespace; truncate for the digest. */
function cleanText(html, max = 300) {
  const text = String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Normalize a URL for dedupe: drop query/hash/trailing slash, lowercase host. */
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}

/** Rough title key for near-duplicate detection across sources. */
function titleKey(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 60);
}

/** Extract items from a parsed feed, handling both RSS 2.0 and Atom. */
function extractItems(doc) {
  const rssItems = doc?.rss?.channel?.item;
  if (rssItems) {
    return [rssItems].flat().map((item) => ({
      title: cleanText(item.title, 200),
      url: typeof item.link === "string" ? item.link : (item.link?.["@_href"] ?? ""),
      publishedAt: item.pubDate ?? item["dc:date"] ?? "",
      summary: cleanText(item.description ?? item["content:encoded"] ?? ""),
      fullHtml: typeof item["content:encoded"] === "string" ? item["content:encoded"] : "",
    }));
  }
  const atomEntries = doc?.feed?.entry;
  if (atomEntries) {
    return [atomEntries].flat().map((entry) => {
      const links = [entry.link ?? []].flat();
      const alternate =
        links.find((l) => l["@_rel"] === "alternate" || !l["@_rel"]) ?? links[0];
      return {
        title: cleanText(entry.title?.["#text"] ?? entry.title, 200),
        url: alternate?.["@_href"] ?? "",
        publishedAt: entry.published ?? entry.updated ?? "",
        summary: cleanText(
          entry.summary?.["#text"] ?? entry.summary ?? entry.content?.["#text"] ?? entry.content ?? "",
        ),
        fullHtml: String(entry.content?.["#text"] ?? entry.content ?? ""),
      };
    });
  }
  return [];
}

async function fetchSource(source, { windowDays, maxItemsPerSource }) {
  const res = await fetch(source.url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "user-agent": "noticias-collector/1.0 (+https://kata.ianexora.com)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const doc = parser.parse(await res.text());

  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  return extractItems(doc)
    .filter((item) => item.title && item.url)
    .map((item) => ({ ...item, ts: Date.parse(item.publishedAt) }))
    .filter((item) => Number.isFinite(item.ts) && item.ts >= cutoff)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, maxItemsPerSource)
    .map(({ ts, ...item }) => ({
      ...item,
      url: cleanUrl(item.url),
      publishedAt: new Date(ts).toISOString(),
      source: source.name,
      // How the publisher is named in running text; the feed label otherwise.
      outlet: source.medio ?? source.name,
      axis: source.axis,
    }));
}

const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
const results = await Promise.allSettled(
  config.sources.map((source) => fetchSource(source, config)),
);

const failed = [];
const items = [];
for (const [i, result] of results.entries()) {
  const source = config.sources[i];
  if (result.status === "fulfilled") {
    items.push(...result.value);
    console.log(`ok   ${source.name}: ${result.value.length} items`);
  } else {
    failed.push(source.name);
    console.warn(`FAIL ${source.name}: ${result.reason?.message ?? result.reason}`);
  }
}

// Dedupe by normalized URL, then by near-identical title (same story via two sources).
const seenUrls = new Set();
const seenTitles = new Set();
const deduped = items
  .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  .filter((item) => {
    const urlKey = normalizeUrl(item.url);
    const tKey = titleKey(item.title);
    if (seenUrls.has(urlKey) || seenTitles.has(tKey)) return false;
    seenUrls.add(urlKey);
    seenTitles.add(tKey);
    return true;
  });

/**
 * Full-text lookup for the lead article. The feed's own content is used when it
 * is already long enough; otherwise the article page is fetched. A fetch error
 * is recorded as insufficient, never thrown: the workflow then falls back to
 * "no new lead article" instead of failing the whole edition.
 */
async function attachFullText(item) {
  let extracted = extractArticleText(item.fullHtml);
  let method = "feed";
  if (!assessSourceText(extracted).sufficient) {
    try {
      const res = await fetch(item.url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "user-agent": "noticias-collector/1.0 (+https://kata.ianexora.com)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      extracted = extractArticleText(await res.text());
      method = "page";
    } catch (error) {
      return {
        ...item,
        textWords: 0,
        textStatus: { sufficient: false, reason: `fetch-failed: ${error?.message ?? error}` },
      };
    }
  }
  const textStatus = assessSourceText(extracted);
  return {
    ...item,
    textWords: extracted.words,
    textStatus: { ...textStatus, method },
    ...(textStatus.sufficient ? { text: extracted.text } : {}),
  };
}

// Rank on title/summary relevance first (cheap), then look up full text only
// for the top few; the rest are marked as not fetched.
const shortlist = new Set(
  rankLeads(deduped.map((i) => ({ ...i, textStatus: { sufficient: true } })))
    .slice(0, FULL_TEXT_LOOKUPS)
    .map((i) => i.url),
);
const enriched = await Promise.all(
  deduped.map(async (item) =>
    shortlist.has(item.url)
      ? attachFullText(item)
      : { ...item, textWords: 0, textStatus: { sufficient: false, reason: "not-fetched" } },
  ),
);
for (const item of enriched) delete item.fullHtml;

await mkdir(new URL(".", OUT_PATH), { recursive: true });
await writeFile(
  OUT_PATH,
  JSON.stringify(
    { collectedAt: new Date().toISOString(), windowDays: config.windowDays, failedSources: failed, items: enriched },
    null,
    2,
  ),
);

const byAxis = Object.entries(
  deduped.reduce((acc, i) => ({ ...acc, [i.axis]: (acc[i.axis] ?? 0) + 1 }), {}),
)
  .map(([axis, n]) => `${axis}=${n}`)
  .join(" ");
console.log(`${enriched.filter((i) => i.textStatus?.sufficient).length} candidates with sufficient full text`);
console.log(`\n${deduped.length} candidates (${byAxis}) → scratch/radar-candidates.json`);
if (deduped.length === 0) {
  console.error("No candidates collected — aborting so the workflow fails visibly.");
  process.exit(1);
}
