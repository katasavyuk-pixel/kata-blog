/**
 * Daily news — why the writing model stopped.
 *
 * claude-code-action prints a sanitized result (`is_error: true`, no text), so a
 * run that dies before its first model call — twelve of them in September —
 * leaves nothing to read in the log. The text is in the execution file the
 * action saves; this prints it and exports it as `motivo` for the incident.
 *
 * Only an errored result is reported: after a successful one the file holds the
 * model's closing message, which is not the reason of whatever failed later.
 * Never fails the step it runs in.
 *
 * Usage: node scripts/radar/claude-result.mjs <claude-execution-output.json>
 */
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * The error text of the last result message, or "" when it did not error.
 * @param {unknown} messages
 * @returns {string}
 */
export function claudeFailureReason(messages) {
  const list = Array.isArray(messages) ? messages : [messages];
  const result = list.findLast((message) => message?.type === "result");
  if (!result || result.is_error !== true) return "";
  const text = [result.result, result.error, ...(Array.isArray(result.errors) ? result.errors : [])]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" · ");
  return (text || `the run ended as ${result.subtype ?? "an error"} without a message`).replace(/\s+/g, " ").trim().slice(0, 300);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let reason = "";
  try {
    reason = claudeFailureReason(JSON.parse(readFileSync(process.argv[2], "utf8")));
  } catch {
    // No file: the failure was not in a Claude step, or it never started.
  }
  console.log(reason ? `Claude stopped with: ${reason}` : "No errored Claude result to report.");
  if (reason && process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `motivo=${reason}\n`);
}
