/**
 * Daily news — why the writing model stopped.
 *
 * write-with-gemini.mjs saves scratch/write-result.json. On a failed run this
 * prints the error and exports it as `motivo` for the rolling incident, without
 * repeating any secret. Never fails the step it runs in.
 *
 * Usage: node scripts/radar/write-result.mjs
 */
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const RESULT_PATH = new URL("../../scratch/write-result.json", import.meta.url);

/**
 * @param {unknown} result
 * @returns {string}
 */
export function writerFailureReason(result) {
  if (!result || typeof result !== "object") return "";
  const row = /** @type {{ ok?: unknown, error?: unknown }} */ (result);
  if (row.ok === true) return "";
  const text = typeof row.error === "string" ? row.error : "";
  return text.replace(/\s+/g, " ").trim().slice(0, 300);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let reason = "";
  try {
    reason = writerFailureReason(JSON.parse(readFileSync(RESULT_PATH, "utf8")));
  } catch {
    // No file: the failure was not in a writing step, or it never started.
  }
  console.log(reason ? `Gemini stopped with: ${reason}` : "No errored Gemini result to report.");
  if (reason && process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `motivo=${reason}\n`);
}
