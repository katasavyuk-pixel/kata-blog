/**
 * The files an edition's email needs and the site does not have: each picture
 * as a JPEG cut to its box, and the sequence as a GIF. Mail clients ignore
 * `object-fit`, classic Outlook cannot show WebP, and no mail client runs the
 * CSS animation the archive page uses. Paths: src/lib/correo.ts.
 *
 * Reads the compiled editions (run `npm run build:content` first), drafts
 * included, and only makes what is missing; `--forzar` makes it all again.
 * The files go in public/correo/ and are committed with the edition:
 * tests/newsletter-edicion.test.ts refuses an edition ready to send without them.
 *
 * The GIF is drawn by the Chrome installed on this machine (playwright-core
 * ships no browser) and assembled by ffmpeg. Its first frame is the whole
 * diagram, because classic Outlook shows only the first frame.
 *
 * Usage: npm run correo [-- --forzar] [-- <issue>]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { FORMATOS_DE_CORREO, SECUENCIA_EN_CORREO, gifDeSecuencia, imagenDeCorreo } from "@/lib/correo";
import { emailColors as c, emailFonts as f } from "@/lib/email-colors";
import { imagenesDeEdicion, type Edicion } from "@/lib/edicion";

const args = process.argv.slice(2);
const forzar = args.includes("--forzar");
const solo = args.find((arg) => !arg.startsWith("--"));
const PUBLIC = join(process.cwd(), "public");
const COMPILADO = join(process.cwd(), ".velite", "newsletters.json");

if (!existsSync(COMPILADO)) {
  console.error("Falta .velite/newsletters.json: corre `npm run build:content` antes.");
  process.exit(1);
}

const ediciones = (JSON.parse(readFileSync(COMPILADO, "utf8")) as Edicion[]).filter((e) => !solo || e.issue === solo);
if (solo && ediciones.length === 0) {
  console.error(`No hay ninguna edición «${solo}».`);
  process.exit(1);
}

const hecho: string[] = [];
const pendiente = (ruta: string) => forzar || !existsSync(join(PUBLIC, ruta));

// ---- Pictures: a JPEG per crop, at twice the size it is shown.
for (const edicion of ediciones) {
  for (const { src, formato } of imagenesDeEdicion(edicion)) {
    const destino = imagenDeCorreo(src, formato);
    if (!pendiente(destino)) continue;
    const { ancho, alto } = FORMATOS_DE_CORREO[formato];
    mkdirSync(dirname(join(PUBLIC, destino)), { recursive: true });
    await sharp(join(PUBLIC, src))
      .resize(ancho * 2, alto * 2, { fit: "cover", position: "attention" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(join(PUBLIC, destino));
    hecho.push(destino);
  }
}

// ---- The sequence: frames drawn in Chrome, a GIF out of ffmpeg.
type Paso = { titulo: string; detalle: string; fallo?: string };

const FPS = 10;
/** Seconds: the finished diagram first, the reset, one per step, the finished diagram again. */
const T = { final: 1.5, reinicio: 0.6, tramo: 0.9, cierre: 1.2, aparece: 0.3 };

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The diagram at rest, in the email's colours; `pintar(pos, opacidades)` moves it. */
function pagina(pasos: readonly Paso[]): string {
  const { ancho, alto } = SECUENCIA_EN_CORREO;
  const columna = ancho / pasos.length;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{width:${ancho}px;height:${alto}px;background:${c.card};font-family:${f.sans};position:relative;overflow:hidden}
    .linea{position:absolute;top:19px;left:${columna / 2}px;right:${columna / 2}px;height:2px;background:${c.textMain}}
    .nodo{position:absolute;top:0;width:${columna}px;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 4px}
    .circulo{margin-top:14px;width:12px;height:12px;border:2px solid ${c.textMain};background:${c.card};border-radius:50%}
    .titulo{margin-top:9px;font-size:13px;line-height:1.2;font-weight:700;color:${c.textMain}}
    .detalle{margin-top:5px;font-size:12px;line-height:1.2;color:${c.textMuted}}
    .fallo{margin-top:7px;font-size:12px;line-height:1.25;font-weight:700;color:${c.accent}}
    .punto{position:absolute;top:11px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:${c.rule};z-index:2}
  </style></head><body>
    <div class="linea"></div>
    ${pasos
      .map(
        (paso, i) => `<div class="nodo" style="left:${i * columna}px">
          <span class="circulo"></span>
          <span class="titulo">${escapar(paso.titulo)}</span>
          <span class="detalle">${escapar(paso.detalle)}</span>
          ${paso.fallo ? `<span class="fallo" data-i="${i}">✕ ${escapar(paso.fallo)}</span>` : ""}
        </div>`,
      )
      .join("")}
    <div class="punto"></div>
    <script>
      const columna = ${columna};
      window.pintar = (pos, opacidades) => {
        document.querySelector(".punto").style.left = (pos + 0.5) * columna + "px";
        for (const fallo of document.querySelectorAll(".fallo")) fallo.style.opacity = opacidades[fallo.dataset.i];
      };
    </script>
  </body></html>`;
}

const suave = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const entre = (x: number) => Math.min(1, Math.max(0, x));

/** Where the dot is and how visible each failure is, `t` seconds into the loop. */
function estado(t: number, n: number): { pos: number; opacidades: number[] } {
  const final = { pos: n - 1, opacidades: Array(n).fill(1) };
  if (t < T.final) return final;
  const recorrido = t - T.final - T.reinicio;
  if (recorrido < 0) {
    // Back at the start: the first failure fades in where the dot waits.
    return { pos: 0, opacidades: Array.from({ length: n }, (_, i) => (i === 0 ? entre((t - T.final) / T.aparece) : 0)) };
  }
  const tramos = (n - 1) * T.tramo;
  if (recorrido >= tramos) return final;
  const tramo = Math.floor(recorrido / T.tramo);
  const pos = tramo + suave((recorrido - tramo * T.tramo) / T.tramo);
  // A failure appears once the dot has reached its step.
  return { pos, opacidades: Array.from({ length: n }, (_, i) => (i === 0 ? 1 : entre((recorrido - i * T.tramo) / T.aparece))) };
}

const conSecuencia = ediciones.filter((e) => e.secuencia && pendiente(gifDeSecuencia(e.issue)));
if (conSecuencia.length > 0) {
  const navegador = await chromium.launch({ channel: "chrome" });
  try {
    for (const edicion of conSecuencia) {
      const pasos = edicion.secuencia!.pasos;
      const n = pasos.length;
      const duracion = T.final + T.reinicio + (n - 1) * T.tramo + T.cierre;
      const { ancho, alto } = SECUENCIA_EN_CORREO;
      const contexto = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2 });
      const pestaña = await contexto.newPage();
      await pestaña.setContent(pagina(pasos));
      const fotogramas = mkdtempSync(join(tmpdir(), "secuencia-"));
      try {
        const total = Math.round(duracion * FPS);
        for (let i = 0; i < total; i += 1) {
          const { pos, opacidades } = estado(i / FPS, n);
          await pestaña.evaluate(([p, o]) => (window as unknown as { pintar: (p: number, o: number[]) => void }).pintar(p, o), [pos, opacidades] as const);
          await pestaña.screenshot({ path: join(fotogramas, `f${String(i).padStart(3, "0")}.png`) });
        }
        const destino = join(PUBLIC, gifDeSecuencia(edicion.issue));
        mkdirSync(dirname(destino), { recursive: true });
        const ffmpeg = spawnSync(
          "ffmpeg",
          [
            "-y",
            "-loglevel",
            "error",
            "-framerate",
            String(FPS),
            "-i",
            join(fotogramas, "f%03d.png"),
            "-vf",
            "split[a][b];[a]palettegen=max_colors=64:reserve_transparent=0[p];[b][p]paletteuse=dither=none",
            "-loop",
            "0",
            destino,
          ],
          { encoding: "utf8" },
        );
        if (ffmpeg.status !== 0) throw new Error(`ffmpeg falló: ${ffmpeg.stderr || ffmpeg.error?.message}`);
        hecho.push(gifDeSecuencia(edicion.issue));
      } finally {
        rmSync(fotogramas, { recursive: true, force: true });
        await contexto.close();
      }
    }
  } finally {
    await navegador.close();
  }
}

console.log(hecho.length > 0 ? hecho.map((ruta) => `public${ruta}`).join("\n") : "Nada que hacer: todo está ya en public/correo.");
