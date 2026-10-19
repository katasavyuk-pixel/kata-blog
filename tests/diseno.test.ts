import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

/**
 * Las reglas de DESIGN.md que una capa antigua puede romper sin que se note.
 *
 * El núcleo del sitio (home, artículo, fichas, kit de piezas) ya seguía el
 * sistema, pero tres capas de rediseños anteriores seguían vivas porque nadie
 * las miraba juntas: tarjetas redondeadas de «Caja de Cristal» dentro de marcos
 * rectos, el halo rojo de las imágenes para redes, y una mascota montada en
 * todas las rutas. Este test es lo que impide que vuelvan por una esquina.
 */
const root = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const fuentes = walk(join(root, 'src'))
  .filter((file) => /\.(ts|tsx|css)$/.test(file))
  .map((file) => ({ file: relative(root, file), text: readFileSync(file, 'utf8') }));

describe('regla 9: esquinas rectas, un solo radio', () => {
  // rounded-sm (4 px) para controles y rounded-full para píldoras y puntos.
  // Cualquier otro tamaño, con o sin lado, y los valores arbitrarios, no.
  const RADIO_MAYOR = /\brounded(?:-[trblse]{1,2})?-(?:md|lg|xl|[2-4]xl|\[[^\]]*\])/;

  test('ningún componente usa un radio mayor que el del sistema', () => {
    for (const { file, text } of fuentes) {
      if (!/\.tsx?$/.test(file)) continue;
      const encontrado = text.match(RADIO_MAYOR);
      assert.equal(encontrado, null, `${file} usa «${encontrado?.[0]}»: los paneles van rectos y los controles con rounded-sm.`);
    }
  });

  test('el CSS global solo conoce el radio del sistema, la píldora, el foco y el logo de una skill', () => {
    const css = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
    // 22 %: el logo de una skill en el marketplace, como el icono de una app
    // (2026-10-14). Es la única excepción a las esquinas rectas.
    const PERMITIDOS = new Set(['var(--radius-sm)', '2px', 'inherit', '999px', '9999px', '22%']);
    for (const [, valor] of css.matchAll(/border-radius:\s*([^;]+);/g)) {
      assert.ok(PERMITIDOS.has(valor.trim()), `globals.css declara border-radius: ${valor.trim()}`);
    }
  });
});

describe('imágenes para redes sin el look cinematográfico', () => {
  // «Nada de grano, viñeta, halo rojo»: se pintan con Satori, fuera del
  // navegador, y por eso sobrevivieron a la limpieza de globals.css.
  test('ni degradados ni viñeta', () => {
    const tarjetas = fuentes.filter(({ file }) => /opengraph-image\.tsx$|og-card\.tsx$/.test(file));
    assert.ok(tarjetas.length >= 3, 'faltan las imágenes OG o su tarjeta compartida');
    for (const { file, text } of tarjetas) {
      assert.doesNotMatch(text, /gradient/i, `${file} vuelve a pintar un degradado.`);
    }
  });
});

describe('regla 1: ni mascotas ni nada montado delante del contenido', () => {
  test('el asistente retirado no vuelve', () => {
    for (const { file, text } of fuentes) {
      assert.doesNotMatch(
        text,
        /AssistantDock|components\/assistant|wizard\/mascot|api\/assistant|\.(?:glow|ember)-[a-z]/,
        `${file} vuelve a traer el asistente o su halo.`,
      );
    }
  });
});

describe('tablas dentro de un artículo', () => {
  // Una guía lleva tablas de cuatro columnas, y en un móvil (335 px de columna)
  // no caben: sin caja propia la última columna quedaba cortada, sin forma de
  // llegar a ella. Visto al maquetar la primera guía, el 13-oct-2026.
  test('cada tabla del MDX va en una caja que se desplaza y se alcanza con el teclado', () => {
    const mdx = readFileSync(join(root, 'src/components/mdx/mdx-content.tsx'), 'utf8');
    assert.match(
      mdx,
      /table:\s*\(props[^)]*\)\s*=>\s*\(\s*<div className="overflow-x-auto" tabIndex=\{0\}[^>]*>\s*<table \{\.\.\.props\} \/>\s*<\/div>/,
    );
  });
});

describe('código dentro de un artículo', () => {
  // Lighthouse, 17-oct-2026: el texto que el resaltador deja sin color heredaba el
  // gris claro que el plugin de prosa pensó para código oscuro, a 1,06:1 sobre el papel.
  test('el texto sin color hereda el de la página, no el gris del plugin', () => {
    const css = fuentes.find((f) => f.file.endsWith('globals.css'))!.text;
    assert.match(css, /--tw-prose-pre-code: var\(--color-fg\);/);
  });
});
