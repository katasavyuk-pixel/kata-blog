import { readFileSync } from "node:fs";
import path from "node:path";

/** One line of the brief roundup shown under the lead article. */
export interface Novedad {
  /** The source's own headline, verified against what was collected. */
  title: string;
  /** The edition's headline for it, in Spanish. Absent in older editions. */
  titular?: string;
  source: string;
  url: string;
  date: string;
  axis: string;
  /** First sentence of the edition's own analysis, in Spanish. */
  resumen: string;
}

/**
 * The publishing step writes attribute values as character references (a
 * headline can carry a quote or an angle bracket). MDX decodes them when it
 * compiles the page; this reader works on the raw file, so it does it too.
 * Same order as `decodeAttribute` in scripts/radar/edition-gate.mjs.
 */
const decodeAttribute = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/**
 * Items of an edition, read from its MDX: the <RadarItem> tags are the same
 * ones the anti-hallucination gate verifies, so what is shown here already
 * matches a real source. Only https links are kept (this renders as an href).
 */
export function parseNovedades(mdx: string, excludeUrl?: string): Novedad[] {
  const items: Novedad[] = [];
  // Same two shapes as ITEM_TAG in scripts/radar/edition-gate.mjs: a well-formed
  // tag, whose values may contain ">", or anything else up to the first ">".
  const pattern = /<RadarItem(?:((?:\s+[\w-]+="[^"]*")+)\s*>|\s+([\s\S]*?)>)([\s\S]*?)<\/RadarItem>/g;
  for (const [, wellFormed, loose, body] of mdx.matchAll(pattern)) {
    const attrs = wellFormed ?? loose;
    const raw = (name: string) => attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
    const get = (name: string) => decodeAttribute(raw(name) ?? "");
    const url = get("url");
    if (!/^https:\/\//.test(url) || url === excludeUrl) continue;
    const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // A headline is only read from a tag that is well formed, like the gate does.
    const titular = wellFormed && raw("titular") !== undefined ? get("titular") : undefined;
    items.push({
      title: get("title"),
      ...(titular === undefined ? {} : { titular }),
      source: get("source"),
      url,
      date: get("date"),
      axis: get("axis"),
      resumen: text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text,
    });
  }
  return items;
}

/** Reads `content/posts/<slug>.mdx` at build time (the page is static). */
export function getNovedades(slug: string, excludeUrl?: string): Novedad[] {
  try {
    const file = path.join(process.cwd(), "content", "posts", `${slug}.mdx`);
    return parseNovedades(readFileSync(file, "utf8"), excludeUrl);
  } catch {
    return [];
  }
}
