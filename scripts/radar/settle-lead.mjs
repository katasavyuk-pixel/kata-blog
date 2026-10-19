/**
 * Lead article — decide whether today's one is published, without stopping the day.
 *
 * The lead article is the optional half of an edition. If the writing step left
 * no file, or the file fails the same checks verify-article.mjs runs, the
 * article is removed and scratch/lead.json is turned into an "insufficient"
 * day: the edition written next no longer leaves that story out, and the last
 * full article stays on /noticias. One bad article used to cost the whole day.
 *
 * Exits 0 whether the article is kept or dropped; only unreadable inputs fail.
 * `--drop "<reason>"` drops it without checking (the content build said no).
 * With GITHUB_OUTPUT set it exports `lead` (kept | dropped | none).
 * `RADAR_CANDIDATES_PATH` and `RADAR_LEAD_PATH` override the inputs for tests.
 *
 * Usage: node scripts/radar/settle-lead.mjs <article.mdx> [--drop "<reason>"]
 */
import { appendFileSync, existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { freshLeadErrors } from "./article-gate.mjs";

const CANDIDATES_PATH =
  process.env.RADAR_CANDIDATES_PATH ??
  new URL("../../scratch/radar-candidates.json", import.meta.url);
const LEAD_PATH =
  process.env.RADAR_LEAD_PATH ?? new URL("../../scratch/lead.json", import.meta.url);

const [mdxPath, flag, forcedReason] = process.argv.slice(2);
if (!mdxPath || (flag && (flag !== "--drop" || !forcedReason))) {
  console.error('Usage: node scripts/radar/settle-lead.mjs <article.mdx> [--drop "<reason>"]');
  process.exit(1);
}

const output = (value) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `lead=${value}\n`);
};

const selection = JSON.parse(await readFile(LEAD_PATH, "utf8"));
if (selection.status !== "lead") {
  console.log("no lead article was selected today; nothing to settle.");
  output("none");
  process.exit(0);
}

let problems;
if (flag === "--drop") {
  problems = [forcedReason];
} else if (!existsSync(mdxPath)) {
  problems = ["the writing step left no article"];
} else {
  const { items } = JSON.parse(await readFile(CANDIDATES_PATH, "utf8"));
  problems = freshLeadErrors(await readFile(mdxPath, "utf8"), items);
}

if (problems.length === 0) {
  console.log("ok — lead article verified against its source (metadata, links, structure, originality).");
  output("kept");
  process.exit(0);
}

await rm(mdxPath, { force: true });
const { title, url, source } = selection.lead;
await writeFile(
  LEAD_PATH,
  JSON.stringify(
    {
      status: "insufficient",
      reason: "the lead article was written but did not pass its checks",
      dropped: { title, url, source, problems },
    },
    null,
    2,
  ),
);

// One line, so GitHub shows it as an annotation on the run.
console.log(`::warning title=Lead article dropped::${problems.length} problem(s): ${problems.join(" | ").replace(/\s+/g, " ")}`);
console.log(`LEAD ARTICLE DROPPED (${problems.length} problems) — ${source}: ${title}\n`);
for (const problem of problems) console.log(`- ${problem}`);
console.log("\nOnly the brief edition is published today; the last full article stays.");
output("dropped");
