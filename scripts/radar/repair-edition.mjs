/**
 * Noticias — deterministic metadata repair.
 *
 * Claude writes the Spanish prose; this step overwrites every verifyable
 * metadata field of each <RadarItem> (title/source/axis/date) with the exact
 * candidate values by URL, so the anti-hallucination gate cannot trip on the
 * writing model re-typing a headline. The URL stays the identity key: if a URL
 * is not in the candidates, that is a real problem and this exits 1.
 *
 * Only the attributes are repaired — the prose inside each <RadarItem> is left
 * as Claude wrote it. The same pass stamps the frontmatter the redesign
 * requires (`seccion`, and a cover file that exists) so a forgotten field
 * cannot fail `velite --strict` after the commit. Run this before
 * verify-edition.mjs.
 *
 * The rewrite itself lives in edition-gate.mjs (`repairRadarItems`), next to the
 * checks it exists to satisfy. `RADAR_CANDIDATES_PATH` overrides the candidates
 * file for the tests.
 *
 * Usage: node scripts/radar/repair-edition.mjs <edition.mdx>
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { ensureRadarFrontmatter } from "./edition-frontmatter.mjs";
import { repairRadarItems } from "./edition-gate.mjs";

const CANDIDATES_PATH =
  process.env.RADAR_CANDIDATES_PATH ??
  new URL("../../scratch/radar-candidates.json", import.meta.url);

const mdxPath = process.argv[2];
if (!mdxPath) {
  console.error("Usage: node scripts/radar/repair-edition.mjs <edition.mdx>");
  process.exit(1);
}

// The writing step can end "successfully" without writing anything (the action
// skips itself on some authentication failures). Say that, not a stack trace.
if (!existsSync(mdxPath)) {
  console.error(`NO EDITION TO REPAIR: the writing step left no file at ${mdxPath}.`);
  process.exit(1);
}

const mdx = await readFile(mdxPath, "utf8");
const { items } = JSON.parse(await readFile(CANDIDATES_PATH, "utf8"));

const { mdx: fixed, repaired, unmatched, titulares } = repairRadarItems(mdx, items);

if (unmatched.length > 0) {
  for (const url of unmatched) {
    console.error(`URL not in candidates (possible hallucination): ${url}`);
  }
  console.error(
    `REPAIR ABORTED (${unmatched.length} item(s) with a URL not in the candidates). ` +
      "The writing model invented a link; refusing to publish.",
  );
  process.exit(1);
}

let stamped;
try {
  stamped = ensureRadarFrontmatter(fixed);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

await writeFile(mdxPath, stamped.mdx, "utf8");
console.log(`ok — ${repaired} RadarItem(s) metadata repaired to exact candidate values.`);
console.log(`${titulares.kept} item(s) keep their own headline in Spanish; ${titulares.dropped.length} dropped.`);
for (const { url, titular, problems } of titulares.dropped) {
  // The item is published with its literal title: a headline is not worth an edition.
  console.log(`::warning title=Headline dropped::${url} — ${problems.join("; ")}${titular ? ` — «${titular}»` : ""}`);
}
for (const note of stamped.notes) console.log(note);
