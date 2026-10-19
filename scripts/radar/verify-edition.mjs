/**
 * Radar IA — anti-hallucination gate.
 *
 * Verifies that every <RadarItem> in a generated edition matches a real
 * candidate from scratch/radar-candidates.json: the URL must exist verbatim
 * and the title must be the candidate's exact title. If the writing model
 * invented or altered anything, this exits 1 and the workflow never opens a PR.
 *
 * The checks themselves live in edition-gate.mjs, where the tests run them too;
 * this file only reads the two inputs and turns the result into an exit code.
 * `RADAR_CANDIDATES_PATH` overrides the candidates file (the tests point it at a
 * fixture); the workflow never sets it.
 *
 * Usage: node scripts/radar/verify-edition.mjs content/posts/radar-2026-07-20.mdx
 */
import { readFile } from "node:fs/promises";
import { NO_ITEMS_MESSAGE, editionErrors, parseRadarItems } from "./edition-gate.mjs";

const CANDIDATES_PATH =
  process.env.RADAR_CANDIDATES_PATH ??
  new URL("../../scratch/radar-candidates.json", import.meta.url);

const mdxPath = process.argv[2];
if (!mdxPath) {
  console.error("Usage: node scripts/radar/verify-edition.mjs <edition.mdx>");
  process.exit(1);
}

const mdx = await readFile(mdxPath, "utf8");
const { items } = JSON.parse(await readFile(CANDIDATES_PATH, "utf8"));

const errors = editionErrors(mdx, items);

if (errors.length === 1 && errors[0] === NO_ITEMS_MESSAGE) {
  console.error(NO_ITEMS_MESSAGE);
  process.exit(1);
}

if (errors.length > 0) {
  console.error(`VERIFICATION FAILED (${errors.length} problems):\n`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const verified = parseRadarItems(mdx);
const conTitular = verified.filter((item) => item.titular !== undefined).length;
console.log(`ok — ${verified.length} items verified against real candidates (${conTitular} with their own headline).`);
