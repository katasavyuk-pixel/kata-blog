#!/usr/bin/env node
/**
 * Turn an image into a post's cover.
 *
 *   npm run portada -- <slug> <imagen> [--prompt "texto" | --prompt-file fichero] [--generator "ChatGPT"]
 *
 * Writes public/covers/<slug>.webp (1672×941, the size every cover has) and
 * public/covers/<slug>.webp.json ({ prompt, createdAt, generator }), the same
 * pair the existing covers carry. The image is made by hand in ChatGPT (Kata's
 * subscription; never a tool that spends credits) and reaches this script as a
 * file — on the phone, as an attachment to the Code session.
 *
 * It refuses what Discover punishes or the site cannot show well: an image
 * that is not landscape 16:9-ish, or one so small that filling 1672×941 would
 * blur it. A card with text as a cover is a judgment only a person can
 * make: the skill says so; this script cannot see it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ANCHO = 1672;
const ALTO = 941;
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const COVERS = join(RAIZ, "public/covers");

const args = process.argv.slice(2);
const valor = (nombre) => {
  const i = args.indexOf(nombre);
  return i === -1 ? undefined : args[i + 1];
};
const opciones = new Set(["--prompt", "--prompt-file", "--generator"]);
const posicionales = args.filter((a, i) => !a.startsWith("--") && !opciones.has(args[i - 1]));
const [slug, imagen] = posicionales;

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

if (!slug || !imagen) salir('Uso: npm run portada -- <slug> <imagen> [--prompt "…" | --prompt-file f] [--generator "ChatGPT"]');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) salir(`«${slug}» no es un slug (minúsculas, números y guiones).`);
if (!existsSync(imagen)) salir(`No existe la imagen ${imagen}.`);

const promptFichero = valor("--prompt-file");
const prompt = (promptFichero ? readFileSync(promptFichero, "utf8") : (valor("--prompt") ?? "")).trim();
const generator = valor("--generator") ?? "ChatGPT";

const meta = await sharp(imagen).metadata().catch(() => salir(`${basename(imagen)} no es una imagen que sharp pueda leer.`));
const { width = 0, height = 0 } = meta;
const proporcion = width / height;
if (proporcion < 1.5 || proporcion > 2.0) {
  salir(`La imagen mide ${width}×${height} (${proporcion.toFixed(2)}:1). Una portada es apaisada, cerca de 16:9: pídela horizontal.`);
}
if (width < ANCHO * 0.75) {
  salir(`La imagen mide ${width}×${height}: demasiado pequeña (se admite hasta un 25 % menos que ${ANCHO} de ancho; más se vería borrosa). Pide una más grande.`);
}

mkdirSync(COVERS, { recursive: true });
const destino = join(COVERS, `${slug}.webp`);
await sharp(imagen)
  .rotate() // honour EXIF orientation of phone photos
  .resize(ANCHO, ALTO, { fit: "cover", position: "centre" })
  .webp({ quality: 82 })
  .toFile(destino);
writeFileSync(
  `${destino}.json`,
  JSON.stringify({ prompt, createdAt: new Date().toISOString(), generator }, null, 2) + "\n",
);

console.log(`public/covers/${slug}.webp  ${ANCHO}×${ALTO}  (de ${width}×${height})`);
console.log(`public/covers/${slug}.webp.json`);
if (!prompt) console.log("Aviso: sin --prompt el .json guarda el prompt vacío. Pásalo si lo tienes.");
console.log(`En el post: cover: /covers/${slug}.webp y un coverAlt que describa la imagen. Sin texto dentro de la imagen.`);
