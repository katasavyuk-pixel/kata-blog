/**
 * Picks today's lead story from scratch/radar-candidates.json and writes
 * scratch/lead.json: either { status: "lead", lead, themes } or
 * { status: "insufficient", reason }. Always exits 0 on a readable input — an
 * insufficient day is a normal outcome, not a failure: the workflow then keeps
 * the last full article and publishes only the brief edition.
 *
 * With GITHUB_OUTPUT set it also exports `lead_status` (lead | insufficient).
 *
 * Usage: node scripts/radar/select-lead.mjs
 */
import { appendFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { pickLead } from "./lead-selection.mjs";

const CANDIDATES_PATH = new URL("../../scratch/radar-candidates.json", import.meta.url);
const LEAD_PATH = new URL("../../scratch/lead.json", import.meta.url);

const { items } = JSON.parse(await readFile(CANDIDATES_PATH, "utf8"));
const result = pickLead(items);
await writeFile(LEAD_PATH, JSON.stringify(result, null, 2));

if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `lead_status=${result.status}\n`);

if (result.status === "lead") {
  console.log(`lead: ${result.lead.source} — ${result.lead.title} (${result.lead.textWords} words, themes: ${result.themes.join(", ")})`);
} else {
  console.log(`no lead article today: ${result.reason}. The last full article stays; only the brief edition is published.`);
}
