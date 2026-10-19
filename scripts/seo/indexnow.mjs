#!/usr/bin/env node
/**
 * IndexNow — notify participating search engines (Bing, Yandex, Seznam, Naver…)
 * that specific URLs changed, so they re-crawl within minutes instead of days.
 *
 * Why this exists for THIS site: ChatGPT's live browsing leans on Bing's index,
 * and the Radar publishes weekly by CI. Telling Bing "this URL is new" on every
 * merge shortens the gap between an edition shipping and an AI engine being
 * able to see it — the same GEO thesis the site teaches in /blog/maitreai-geo.
 * Google does not use IndexNow; this is not a Google play.
 *
 * The key file lives in public/indexnow-<key>.txt (served statically at the
 * root, exactly where the spec's keyLocation check expects it). The key is
 * public BY DESIGN — it proves ownership of the domain to the API, it is not
 * a secret. Never move it to Doppler or gitignore it.
 *
 * Usage:
 *   node scripts/seo/indexnow.mjs / /blog /blog/mi-post
 *   node scripts/seo/indexnow.mjs --diff=HEAD~1        # URLs de contenido cambiado
 *   node scripts/seo/indexnow.mjs --diff=HEAD~1 --listar   # solo las imprime, sin avisar
 *
 * `--listar` es lo que mira el workflow antes de esperar al despliegue: la
 * edición diaria cambia content/ cada día y no se anuncia nunca (va en
 * noindex), así que esperar por ella era pagar minutos para no avisar a nadie.
 *
 * --diff mode maps changed files to public URLs:
 *   content/posts/*.mdx        → /blog/<slug>  (solo si ya no es draft, y nunca
 *                                una pieza automática sin revisar: va en
 *                                `noindex`, y anunciar a un buscador una URL
 *                                que se le pide no indexar es contradecirse)
 *   content/newsletters/*.md   → /newsletter/<slug> (solo si sent: true)
 *   cualquier otro cambio      → nada: una URL que no cambió no se pingea.
 * La regla vive en indexnow-urls.mjs, que es lo que prueban los tests.
 *
 * Exit codes: 0 = aceptado (202/200), 1 = rechazado o error de red. El caller
 * (CI) no debe romper el deploy por esto: IndexNow es una optimización, y el
 * fallo se reporta y se olvida.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { publicUrlFor } from "./indexnow-urls.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_HOST = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kata.ianexora.com";
const API = "https://api.indexnow.org/indexnow";

function findKey() {
  const files = readdirSync(join(ROOT, "public")).filter(
    (f) => f.startsWith("indexnow-") && f.endsWith(".txt"),
  );
  if (files.length === 0) {
    throw new Error("No hay clave IndexNow en public/ (se espera indexnow-<key>.txt)");
  }
  if (files.length > 1) {
    throw new Error(`Claves IndexNow múltiples (${files.join(", ")}): deja solo una`);
  }
  const file = files[0];
  const key = readFileSync(join(ROOT, "public", file), "utf8").trim();
  if (!/^[a-f0-9-]{8,128}$/i.test(key)) {
    throw new Error(`La clave de ${file} no parece una clave IndexNow válida`);
  }
  return { key, keyLocation: `${DEFAULT_HOST}/${file}` };
}

/** Map changed content files to the public URLs the change affects. */
function urlsFromDiff(rev) {
  const out = execFileSync("git", ["diff", "--name-only", rev], { cwd: ROOT, encoding: "utf8" });
  const urls = new Set();
  for (const file of out.split("\n").map((f) => f.trim()).filter(Boolean)) {
    const full = join(ROOT, file);
    if (!existsSync(full)) continue; // deleted
    const url = publicUrlFor(file, readFileSync(full, "utf8"));
    if (url) urls.add(url);
  }
  return [...urls];
}

function parseArgs(argv) {
  const diff = argv.find((a) => a.startsWith("--diff="))?.slice("--diff=".length);
  const urls = argv.filter((a) => !a.startsWith("--"));
  if (!diff && urls.length === 0) {
    console.error("Uso: indexnow.mjs /ruta [/ruta…] | --diff=<git-rev> [--listar]");
    process.exit(1);
  }
  return { diff, urls, listar: argv.includes("--listar") };
}

const { diff, urls: argUrls, listar } = parseArgs(process.argv.slice(2));
const urls = diff ? urlsFromDiff(diff) : argUrls.map((u) => (u.startsWith("/") ? u : `/${u}`));

if (listar) {
  for (const u of urls) console.log(u);
  process.exit(0);
}

if (urls.length === 0) {
  console.log("indexnow: nada que notificar (sin cambios de contenido público).");
  process.exit(0);
}

const { key, keyLocation } = findKey();
const host = new URL(DEFAULT_HOST).host;
const urlList = urls.map((u) => `${DEFAULT_HOST}${u}`);

console.log(`indexnow: notificando ${urlList.length} URL(s) a ${API}`);
for (const u of urlList) console.log(`  ${u}`);

try {
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation, urlList }),
  });
  // 202 = accepted, 200 = OK; anything else (400 invalid, 403 wrong key, 422
  // bad URL, 429 too many) is a rejection worth seeing in the CI log.
  if (res.status === 200 || res.status === 202) {
    console.log(`indexnow: aceptado (${res.status}).`);
  } else {
    console.error(`indexnow: rechazado (${res.status}). Revisa la respuesta y la keyLocation.`);
    process.exit(1);
  }
} catch (err) {
  console.error(`indexnow: error de red — ${err.message}`);
  process.exit(1);
}
