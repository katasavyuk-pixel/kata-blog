/**
 * Lead article — anti-hallucination and sufficiency gate (CLI).
 *
 * Checks a generated `noticia-YYYY-MM-DD.mdx` against scratch/radar-candidates.json:
 * source metadata and links match a real candidate with sufficient full text,
 * the structure is complete and the prose is not a copy of the source. Exits 1
 * on any problem, so a bad article is never committed. Rules live in
 * article-gate.mjs; this file only does the I/O. The workflow runs the same
 * checks through settle-lead.mjs, which drops a failing article instead of
 * stopping the day. `RADAR_CANDIDATES_PATH` overrides the candidates file.
 *
 * Usage: node scripts/radar/verify-article.mjs content/posts/noticia-2026-10-09.mdx
 */
import { readFile } from "node:fs/promises";
import { NOT_A_LEAD_MESSAGE, freshLeadErrors } from "./article-gate.mjs";

const CANDIDATES_PATH =
  process.env.RADAR_CANDIDATES_PATH ??
  new URL("../../scratch/radar-candidates.json", import.meta.url);

const mdxPath = process.argv[2];
if (!mdxPath) {
  console.error("Usage: node scripts/radar/verify-article.mjs <article.mdx>");
  process.exit(1);
}

const mdx = await readFile(mdxPath, "utf8");
const { items } = JSON.parse(await readFile(CANDIDATES_PATH, "utf8"));

const errors = freshLeadErrors(mdx, items);
if (errors.length === 1 && errors[0] === NOT_A_LEAD_MESSAGE) {
  console.error(NOT_A_LEAD_MESSAGE);
  process.exit(1);
}
if (errors.length > 0) {
  console.error(`ARTICLE VERIFICATION FAILED (${errors.length} problems):\n`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("ok — lead article verified against its source (metadata, links, structure, originality).");
