/**
 * Daily news — local rehearsal: write and verify today's edition, publish nothing.
 *
 * Collects RSS candidates, selects a lead, writes with Gemini, runs the same
 * gates as the workflow (settle-lead, repair-edition, verify-edition,
 * no-secrets) and stops there. Never commits or pushes.
 *
 * Usage: node scripts/radar/ensayo.mjs
 * Env:   GEMINI_API_KEY (required), EDITION_DATE (optional, UTC today),
 *        GEMINI_MODEL (optional).
 */
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function run(command, args, env) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main(env) {
  if (!env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set");
    process.exit(1);
  }
  const date = env.EDITION_DATE || new Date().toISOString().slice(0, 10);
  const editionFile = `content/posts/noticias-${date}.mdx`;
  const leadFile = `content/posts/noticia-${date}.mdx`;
  const childEnv = { ...env, EDITION_DATE: date, EDITION_FILE: editionFile, LEAD_FILE: leadFile };

  console.log(`ensayo — ${date} (writes locally, does not publish)`);
  await rm(editionFile, { force: true });
  await rm(leadFile, { force: true });

  run(process.execPath, ["scripts/radar/collect.mjs"], childEnv);
  run(process.execPath, ["scripts/radar/select-lead.mjs"], childEnv);

  let leadStatus = "insufficient";
  try {
    leadStatus = JSON.parse(await readFile("scratch/lead.json", "utf8")).status;
  } catch {
    // select-lead always writes the file on a readable input.
  }
  if (leadStatus === "lead") {
    const lead = spawnSync(process.execPath, ["scripts/radar/write-with-gemini.mjs", "lead"], {
      stdio: "inherit",
      env: childEnv,
    });
    if (lead.status !== 0) {
      console.log("lead writing failed; settle-lead will drop it and the edition still goes on.");
    }
    run(process.execPath, ["scripts/radar/settle-lead.mjs", leadFile], childEnv);
  } else {
    console.log("no lead article today; only the brief edition will be written.");
  }

  run(process.execPath, ["scripts/radar/write-with-gemini.mjs", "edition"], childEnv);
  run(process.execPath, ["scripts/radar/repair-edition.mjs", editionFile], childEnv);
  run(process.execPath, ["scripts/radar/verify-edition.mjs", editionFile], childEnv);
  run(process.execPath, ["scripts/radar/no-secrets.mjs", editionFile, leadFile], childEnv);

  const edition = await readFile(editionFile, "utf8");
  const title = edition.match(/^title:\s*"?(.+?)"?\s*$/m)?.[1] ?? "(no title)";
  const leadKept = existsSync(leadFile);
  console.log(`\nensayo ok — ${title}`);
  console.log(`edition: ${editionFile}${leadKept ? `\nlead:    ${leadFile}` : "\nlead:    (none kept)"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.env);
}
