/**
 * Weekly edition — write the draft.
 *
 * Gathers the week's daily editions and lead articles, proposes a short list
 * and writes content/newsletters/<AAAA-sNN>.md with `draft: true`. Everything
 * it decides is in src/lib/semanal.ts; this file only reads and writes.
 *
 * It never sends and never overwrites an edition somebody has worked on: an
 * existing file is left alone unless `--forzar`, and one that is no longer a
 * draft is never replaced.
 *
 * Needs the content built first (`npm run build:content`): it reads the same
 * compiled posts the site does.
 *
 * Usage: npm run semanal -- [--hasta AAAA-MM-DD] [--forzar] [--salida <fichero>]
 *   --hasta   last day of the week (default: yesterday, UTC)
 *   --salida  write somewhere else, e.g. to look at a draft without adding it
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOGOS_DE_SKILL } from "@/config/logos";
import { siteConfig } from "@/config/site";
import { entradasEntre } from "@/lib/bitacora";
import { ACTIVOS } from "@/lib/catalogo";
import { medioDe } from "@/lib/medios";
import { getNovedades } from "@/lib/novedades";
import { getArticulosNoticia, getEdiciones, getPost } from "@/lib/posts";
import {
  borradorSemanal,
  elegir,
  enSemana,
  idDeSemana,
  reunir,
  semanaHasta,
  type Construido,
  type Imagen,
} from "@/lib/semanal";

const args = process.argv.slice(2);
const valor = (nombre: string) => {
  const i = args.indexOf(nombre);
  return i === -1 ? undefined : args[i + 1];
};
const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const semana = semanaHasta(valor("--hasta") ?? ayer);
const id = idDeSemana(semana.hasta);
const DIRECTORIO = join(process.cwd(), "content", "newsletters");
const destino = valor("--salida") ?? join(DIRECTORIO, `${id}.md`);

if (existsSync(destino)) {
  const actual = readFileSync(destino, "utf8");
  if (!/^draft:\s*true\s*$/m.test(actual)) {
    console.error(`${destino} ya no es un borrador: no se toca.`);
    process.exit(1);
  }
  if (!args.includes("--forzar")) {
    console.error(`${destino} ya existe. Con --forzar se vuelve a escribir y se pierde lo editado.`);
    process.exit(1);
  }
}

/** A post's cover, as an edition carries it: the path in public/ and its alt text. */
function portadaDe(post: { cover?: { src: string }; coverAlt?: string; title: string }): Imagen | undefined {
  return post.cover ? { src: post.cover.src, alt: post.coverAlt ?? post.title } : undefined;
}

const ediciones = getEdiciones()
  .filter((post) => enSemana(post.date, semana))
  .map((post) => ({ date: post.date, novedades: getNovedades(post.slug) }));
const protagonistas = getArticulosNoticia()
  .filter((post) => enSemana(post.date, semana))
  .map((post) => ({
    date: post.date,
    title: post.title,
    description: post.description,
    permalink: post.permalink,
    medio: post.fuente_medio ?? "",
    fuenteUrl: post.fuente_url,
    imagen: portadaDe(post),
  }));

// The editions name the feed; the email names the outlet (src/lib/medios.ts).
const noticias = reunir(semana, ediciones, protagonistas, medioDe);
const elegidas = elegir(noticias);

// What other editions (sent or still drafts) already point at, so the same
// piece is not offered twice.
const yaEnlazado = existsSync(DIRECTORIO)
  ? readdirSync(DIRECTORIO)
      .filter((nombre) => nombre.endsWith(".md") && join(DIRECTORIO, nombre) !== destino)
      .map((nombre) => readFileSync(join(DIRECTORIO, nombre), "utf8"))
      .join("\n")
  : "";
const sinUsar = (ruta: string) => !yaEnlazado.includes(`${siteConfig.url}${ruta}`);

// One skill a week, the first one no other edition has recommended yet.
const recomendada = (id: string) =>
  new RegExp(`^skill:\\s*${id}\\s*$`, "m").test(yaEnlazado) || !sinUsar(`/marketplace/${id}`);
const conFoto = ACTIVOS.filter((item) => LOGOS_DE_SKILL[item.id]);
const skill = (conFoto.find((item) => !recomendada(item.id)) ?? conFoto[0])?.id;

// What I shipped that week, from the build log: the entry's own link is its proof,
// and an entry about a piece shows that piece's cover.
const construido: Construido[] = entradasEntre(semana.desde, semana.hasta).map((entrada) => {
  const post = entrada.enlace.startsWith("/blog/") ? getPost(entrada.enlace.slice("/blog/".length).split("#")[0]) : undefined;
  const imagen = post && portadaDe(post);
  return {
    titulo: entrada.titulo,
    url: entrada.enlace,
    frase: entrada.html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
    fecha: entrada.fecha.slice(0, 10),
    tipo: entrada.tipo,
    proyecto: entrada.proyecto,
    ...(imagen ? { imagen } : {}),
  };
});

writeFileSync(
  destino,
  borradorSemanal({
    semana,
    elegidas,
    total: noticias.length,
    construido,
    skill,
    siteUrl: siteConfig.url,
    generado: new Date().toISOString().slice(0, 10),
  }),
);

console.log(`${destino}`);
console.log(
  `Semana ${semana.desde} → ${semana.hasta} (${id}): ${ediciones.length} ediciones, ${protagonistas.length} artículos, ` +
    `${noticias.length} noticias distintas, ${elegidas.length} en el borrador ` +
    `(${elegidas.filter((n) => !n.enEspanol).length} con el titular sin traducir).`,
);
console.log(`Para usar: ${skill ?? "nada"} · De la bitácora: ${construido.length} ${construido.length === 1 ? "entrada" : "entradas"}`);
console.log("Antes de enviarla: npm run build:content && npm run correo (las imágenes del correo).");
