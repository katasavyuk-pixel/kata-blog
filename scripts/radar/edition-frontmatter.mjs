/**
 * Frontmatter the daily Radar edition must carry for `velite --strict`.
 *
 * Published posts need `seccion` and a cover file that exists under
 * public/covers/. The daily writer does not generate a photograph, so an
 * edition that omits the cover — or points at a path that is not on disk —
 * is stamped with the shared series image. A cover that already exists and
 * has coverAlt is left alone, so a later unique photograph is not overwritten.
 *
 * Title, URL, source and axis are not touched here. Those stay with
 * repair-edition.mjs / verify-edition.mjs.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SHARED_RADAR_COVER = "/covers/radar.webp";
export const SHARED_RADAR_COVER_ALT =
  "Vigía observa el horizonte al amanecer desde un puesto de costa, con una luz roja de señal.";

const PUBLIC_DIR = fileURLToPath(new URL("../../public/", import.meta.url));
const COVERS_DIR = path.resolve(PUBLIC_DIR, "covers");

export function splitFrontmatter(mdx) {
  const match = mdx.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return {
    yaml: match[1],
    before: mdx.slice(0, match.index),
    after: mdx.slice(match.index + match[0].length),
  };
}

/** Single-line scalar, with one layer of quotes removed. */
export function fieldValue(yaml, key) {
  const match = yaml.match(new RegExp(`^${key}:[ \\t]*(.*)$`, "m"));
  if (!match) return undefined;
  const raw = match[1].trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  return raw;
}

function setField(yaml, key, line, afterKey) {
  const existing = new RegExp(`^${key}:.*$`, "m");
  if (existing.test(yaml)) return yaml.replace(existing, line);
  if (afterKey && new RegExp(`^${afterKey}:.*$`, "m").test(yaml)) {
    return yaml.replace(new RegExp(`^${afterKey}:.*$`, "m"), (found) => `${found}\n${line}`);
  }
  return `${yaml}\n${line}`;
}

/** Absolute path of a /covers/ file, or null when the path escapes that folder. */
export function resolveCoverFile(coverPath) {
  if (typeof coverPath !== "string" || !coverPath.startsWith("/covers/")) return null;
  if (coverPath.includes("..")) return null;
  const abs = path.resolve(PUBLIC_DIR, coverPath.slice(1));
  if (abs !== COVERS_DIR && !abs.startsWith(`${COVERS_DIR}${path.sep}`)) return null;
  return abs;
}

export function coverFileExists(coverPath) {
  const abs = resolveCoverFile(coverPath);
  return Boolean(abs && existsSync(abs));
}

/**
 * @param {string} mdx
 * @returns {{ mdx: string, notes: string[] }}
 */
export function ensureRadarFrontmatter(mdx) {
  const parts = splitFrontmatter(mdx);
  if (!parts) {
    throw new Error("Edition has no YAML frontmatter.");
  }

  const notes = [];
  let yaml = parts.yaml;

  if (fieldValue(yaml, "tema") !== "contenido") {
    yaml = setField(yaml, "tema", "tema: contenido", "date");
    notes.push("frontmatter: tema set to contenido");
  }
  if (fieldValue(yaml, "formato") !== "radar") {
    yaml = setField(yaml, "formato", "formato: radar", "tema");
    notes.push("frontmatter: formato set to radar");
  }
  if (fieldValue(yaml, "seccion") !== "radar") {
    yaml = setField(yaml, "seccion", "seccion: radar", "formato");
    notes.push("frontmatter: seccion set to radar");
  }
  if (fieldValue(yaml, "draft") !== "false") {
    yaml = setField(yaml, "draft", "draft: false", "premium");
    notes.push("frontmatter: draft set to false");
  }
  // `revisado` is what puts an automated piece in the search index and changes
  // its disclosure to "reviewed by a person". Only a person sets it, after
  // reading the published edition; the writing model never can.
  if (fieldValue(yaml, "revisado") === "true") {
    yaml = setField(yaml, "revisado", "revisado: false");
    notes.push("frontmatter: revisado reset to false (only a person sets it)");
  }

  const cover = fieldValue(yaml, "cover");
  const coverAlt = fieldValue(yaml, "coverAlt")?.trim() ?? "";
  const keepOwnCover = coverFileExists(cover) && coverAlt.length > 0;
  if (!keepOwnCover) {
    yaml = setField(yaml, "cover", `cover: ${SHARED_RADAR_COVER}`, "seccion");
    yaml = setField(
      yaml,
      "coverAlt",
      `coverAlt: ${JSON.stringify(SHARED_RADAR_COVER_ALT)}`,
      "cover",
    );
    notes.push(
      cover
        ? `frontmatter: cover ${cover} is missing on disk or has no alt; using the shared Radar cover`
        : "frontmatter: shared Radar cover added",
    );
  }

  return {
    mdx: `${parts.before}---\n${yaml}\n---${parts.after}`,
    notes,
  };
}

/**
 * `a_raiz_de` and `se_resuelve_con` connect a hand-written piece to the rest of
 * the site (src/lib/relaciones.ts). Saying that one text was prompted by
 * another, or that a system deals with it, is an editorial judgement: an
 * automated piece never declares them, and the site's build would refuse it.
 */
export function relationErrors(yaml) {
  return ["a_raiz_de", "se_resuelve_con"]
    .filter((key) => new RegExp(`^${key}:`, "m").test(yaml))
    .map((key) => `frontmatter ${key} is for hand-written pieces: an automated one cannot declare relations`);
}

/** Problems that would fail `velite --strict` or publish the edition in the wrong shelf. */
export function radarFrontmatterErrors(mdx) {
  const parts = splitFrontmatter(mdx);
  if (!parts) return ["edition has no YAML frontmatter"];

  const errors = [];
  const { yaml } = parts;
  if (fieldValue(yaml, "tema") !== "contenido") {
    errors.push('frontmatter tema must be "contenido"');
  }
  if (fieldValue(yaml, "formato") !== "radar") {
    errors.push('frontmatter formato must be "radar"');
  }
  if (fieldValue(yaml, "seccion") !== "radar") {
    errors.push('frontmatter seccion must be "radar"');
  }
  const cover = fieldValue(yaml, "cover");
  if (!coverFileExists(cover)) {
    errors.push(
      `frontmatter cover must be a file in public/covers (got: ${cover ?? "missing"})`,
    );
  }
  if (!fieldValue(yaml, "coverAlt")?.trim()) {
    errors.push("frontmatter coverAlt is required");
  }
  if (fieldValue(yaml, "revisado") === "true") {
    errors.push("frontmatter revisado cannot be true on a fresh edition: only a person sets it, after reading it");
  }
  errors.push(...relationErrors(yaml));
  return errors;
}
