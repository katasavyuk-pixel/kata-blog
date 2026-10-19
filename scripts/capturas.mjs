#!/usr/bin/env node
/**
 * Full-page screenshots of the pages that carry the site's look, at desktop
 * and phone width, so a redesign is compared against a picture instead of a
 * memory. There is no visual test in CI; this is the safety net by hand.
 *
 *   node scripts/capturas.mjs <base-url> <out-dir> [ruta ...]
 *   node scripts/capturas.mjs http://localhost:3001 /tmp/antes
 *
 * Runs the Chrome installed on this machine (playwright-core ships no
 * browser). Signup flows are left out on purpose: Turnstile is live and they
 * are tested by hand (CLAUDE.md). Prints, per capture, the page height and
 * whether anything overflows sideways, which is the defect a screenshot hides
 * at a glance.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright-core";

const RUTAS = [
  "/",
  "/blog/cuando-la-ia-se-abarata-el-coste-cambia-de-sitio",
  "/blog/noticias-2026-10-13",
  "/blog/noticia-2026-10-13",
  "/blog/maitreai-geo",
  "/blog",
  "/noticias",
  "/marketplace",
  "/sistemas",
  "/herramientas",
  "/sobre-mi",
  "/newsletter",
];

const ANCHOS = [
  { nombre: "escritorio", width: 1280, height: 800 },
  { nombre: "movil", width: 375, height: 812 },
];

const [base, salida, ...propias] = process.argv.slice(2);
if (!base || !salida) {
  console.error("Uso: node scripts/capturas.mjs <base-url> <out-dir> [ruta ...]");
  process.exit(2);
}
const rutas = propias.length > 0 ? propias : RUTAS;

await mkdir(salida, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
let fallos = 0;
try {
  for (const ancho of ANCHOS) {
    const page = await browser.newPage({ viewport: { width: ancho.width, height: ancho.height } });
    for (const ruta of rutas) {
      const res = await page.goto(new URL(ruta, base).href, { waitUntil: "networkidle" });
      const estado = res?.status() ?? 0;
      // Lazy images only load when scrolled into view. `instant`, because the
      // site sets smooth scrolling and a measure taken mid-glide is wrong.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
          window.scrollTo({ top: y, behavior: "instant" });
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo({ top: 0, behavior: "instant" });
      });
      // Where the first paragraph of reading text starts, from the top of the
      // page: above the fold (800 px on a laptop) or not.
      const medida = await page.evaluate(() => {
        // The body text when there is one; a kicker or a meta line is a <p> too.
        const p = document.querySelector(".prose > p") ?? document.querySelector("main p");
        return {
          alto: document.documentElement.scrollHeight,
          desborda: document.documentElement.scrollWidth > window.innerWidth,
          primerParrafo: p ? Math.round(p.getBoundingClientRect().top + window.scrollY) : -1,
        };
      });
      const nombre = `${ruta === "/" ? "home" : ruta.replace(/^\//, "").replace(/\//g, "_")}-${ancho.nombre}.png`;
      await page.screenshot({ path: join(salida, nombre), fullPage: true });
      if (estado !== 200 || medida.desborda) fallos++;
      console.log(
        `${estado} ${ancho.nombre.padEnd(10)} ${ruta.padEnd(56)} alto ${String(medida.alto).padStart(5)}  primer párrafo ${String(medida.primerParrafo).padStart(5)}${medida.desborda ? "  DESBORDA" : ""}`,
      );
    }
    await page.close();
  }
} finally {
  await browser.close();
}
process.exit(fallos > 0 ? 1 : 0);
