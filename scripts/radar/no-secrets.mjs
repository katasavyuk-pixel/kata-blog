/**
 * Daily news — refuse to publish a credential.
 *
 * The writing model reads text nobody here controls (feed summaries, a whole
 * article) and what it writes goes to a public site with no person in between.
 * Its process holds the token it runs with, so a file that came out of it is
 * checked before it is pushed: for the literal value of each secret the job
 * knows (also reversed, in base64 and in hex — the transformations an injected
 * instruction would reach for first) and for anything shaped like a token.
 *
 * It is a last check on the way out, not a guarantee: an attacker who controls
 * the encoding can beat a scanner. It never prints what it found.
 *
 * Usage: node scripts/radar/no-secrets.mjs <file>...
 * Env:   the secrets named in SECRET_ENV (default below), when present.
 */
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SECRET_ENV = ["CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_API_KEY", "GITHUB_TOKEN", "GH_TOKEN"];

/** Shapes that are never legitimate in a news post, whoever they belong to. */
export const TOKEN_SHAPES = [
  { name: "Anthropic key or token", re: /sk-ant-[a-z0-9]+-[A-Za-z0-9_-]{20,}/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "GitHub fine-grained token", re: /\bgithub_pat_[A-Za-z0-9_]{30,}/ },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "private key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

const MIN_SECRET_LENGTH = 12;

/** A secret as it would look after the obvious disguises. */
function disguises(value) {
  const bytes = Buffer.from(value, "utf8");
  return [
    ["as is", value],
    ["reversed", [...value].reverse().join("")],
    ["in base64", bytes.toString("base64").replace(/=+$/, "")],
    ["in base64url", bytes.toString("base64url")],
    ["in hex", bytes.toString("hex")],
  ];
}

/**
 * @param {string} text
 * @param {Record<string, string | undefined>} secrets name → value
 * @returns {string[]} what was found, without the value
 */
export function secretFindings(text, secrets = {}) {
  const found = [];
  // Whitespace is dropped so a value broken across lines or words still matches.
  const compact = text.replace(/\s+/g, "");
  for (const [name, value] of Object.entries(secrets)) {
    if (typeof value !== "string" || value.length < MIN_SECRET_LENGTH) continue;
    for (const [how, shape] of disguises(value)) {
      if (compact.includes(shape) || compact.toLowerCase().includes(shape.toLowerCase())) {
        found.push(`the value of ${name} (${how})`);
        break;
      }
    }
  }
  for (const { name, re } of TOKEN_SHAPES) {
    if (re.test(text) || re.test(compact)) found.push(`something shaped like a ${name}`);
  }
  return found;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = process.argv.slice(2).filter((file) => existsSync(file));
  if (files.length === 0) {
    console.error("Usage: node scripts/radar/no-secrets.mjs <file>...  (none of the given files exists)");
    process.exit(1);
  }
  const secrets = Object.fromEntries(SECRET_ENV.map((name) => [name, process.env[name]]));
  let problems = 0;
  for (const file of files) {
    for (const finding of secretFindings(readFileSync(file, "utf8"), secrets)) {
      console.error(`${file}: contains ${finding}`);
      problems += 1;
    }
  }
  if (problems > 0) {
    console.error(`\nREFUSING TO PUBLISH (${problems} finding(s)). Treat the credential as leaked to the model and rotate it.`);
    process.exit(1);
  }
  console.log(`ok — no credential in ${files.length} file(s).`);
}
