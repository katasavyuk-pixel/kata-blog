#!/usr/bin/env node
/**
 * Draft build-log entries from what shipped since the newest entry.
 *
 *   npm run bitacora            # since the newest entry in content/bitacora
 *   npm run bitacora -- 2026-10-01
 *
 * Reads the blog's merged pull requests and the commits of the public skills
 * repository (gh CLI, already signed in), and writes one file per item in
 * content/bitacora with `draft: true`. Nothing is published: Kata rewrites
 * the title in his words, sets `enlace` to the page where it can be checked
 * and removes `draft`, or deletes the file. Most weeks hold two or three
 * entries worth keeping, not one per pull request.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = new URL("../../content/bitacora/", import.meta.url).pathname;
const SKILLS_REPO = "katasavyuk-pixel/skills-negocio-pequeno";

function ultimaFecha() {
  const fechas = readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readFileSync(join(DIR, f), "utf8").match(/^fecha:\s*(\d{4}-\d{2}-\d{2})/m)?.[1])
    .filter(Boolean)
    .sort();
  return fechas.at(-1) ?? "2026-01-01";
}

function gh(args) {
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8" }));
}

/** «fix(x): …» → arreglo; a new route or «feat» → lanzamiento is a guess Kata corrects. */
function tipoDe(titulo) {
  if (/^fix|arregl|corrig/i.test(titulo)) return "arreglo";
  if (/^feat|nuev|lanza/i.test(titulo)) return "mejora";
  return "mejora";
}

const desde = process.argv[2] ?? ultimaFecha();
const items = [
  ...gh(["pr", "list", "--state", "merged", "--search", `merged:>${desde}`, "--limit", "50", "--json", "number,title,mergedAt,url"]).map((pr) => ({
    fecha: pr.mergedAt.slice(0, 10),
    titulo: pr.title.replace(/^\w+(\([^)]*\))?:\s*/, ""),
    proyecto: "blog",
    referencia: `PR #${pr.number} (repositorio privado: no sirve de enlace) ${pr.url}`,
  })),
  ...gh(["api", `repos/${SKILLS_REPO}/commits?since=${desde}T23:59:59Z&per_page=50`]).map((c) => ({
    fecha: c.commit.committer.date.slice(0, 10),
    titulo: c.commit.message.split("\n")[0].replace(/^\w+(\([^)]*\))?:\s*/, ""),
    proyecto: "skills",
    referencia: `commit público: ${c.html_url}`,
  })),
];

let escritos = 0;
for (const [i, item] of items.entries()) {
  const fichero = join(DIR, `${item.fecha}-borrador-${item.proyecto}-${i + 1}.md`);
  if (existsSync(fichero)) continue;
  const titulo = item.titulo.slice(0, 110).replace(/"/g, "'");
  writeFileSync(
    fichero,
    [
      "---",
      "# BORRADOR de scripts/bitacora/borrador.mjs. Antes de quitar `draft`:",
      "#   [ ] el título, con tus palabras y en español",
      "#   [ ] `enlace`: la página donde se ve (/...) o una URL pública; nunca el repositorio privado",
      "#   [ ] `proyecto` y `tipo` (lanzamiento, mejora, arreglo, hito)",
      `# De: ${item.referencia}`,
      `titulo: "${titulo}"`,
      `fecha: ${item.fecha}`,
      `proyecto: ${item.proyecto}`,
      `tipo: ${tipoDe(item.titulo)}`,
      'enlace: "/"',
      "draft: true",
      "---",
      "",
      "Una o dos frases: qué cambia para quien lo usa.",
      "",
    ].join("\n"),
  );
  escritos += 1;
}

console.log(`Desde ${desde}: ${items.length} cambios, ${escritos} borradores nuevos en content/bitacora (draft: true).`);
