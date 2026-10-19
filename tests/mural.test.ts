import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { LOGOS_DE_SKILL } from '@/config/logos';
import { entradasBitacora } from '@/lib/bitacora';
import { ACTIVOS } from '@/lib/catalogo';
import { columnasDelMural } from '@/lib/mural';
import { leerPortada } from '@/lib/portada-lectura';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const source = (file: string) => readFileSync(join(root, file), 'utf8');

/**
 * El mural de la portada (2026-10-15, «D»): las noticias del día, las skills y
 * la bitácora, en columnas que se mueven junto al titular. Sale de lo
 * publicado; se para con el ratón, con el teclado y con un botón; y con
 * movimiento reducido no se mueve.
 */
describe('el mural de la portada', () => {
  const columnas = columnasDelMural(leerPortada());

  test('sale de lo publicado: noticias, skills y bitácora, en ese orden', () => {
    assert.deepEqual(columnas.map((c) => c.id), ['noticias', 'skills', 'bitacora']);
    const skills = columnas.find((c) => c.id === 'skills');
    assert.deepEqual(skills?.piezas.map((p) => p.id), ACTIVOS.map((a) => a.id));
    const bitacora = columnas.find((c) => c.id === 'bitacora');
    assert.equal(bitacora?.total, entradasBitacora.length);
    assert.equal(bitacora?.piezas[0].href, entradasBitacora[0].permalink);
  });

  test('cada skill lleva su línea, y su foto si la tiene existe', () => {
    for (const [id, logo] of Object.entries(LOGOS_DE_SKILL)) {
      assert.ok(logo.lema.length > 0 && logo.lema.length <= 60, `${id}: la línea del mural.`);
      if (logo.foto) {
        assert.match(logo.foto, /^\/skills\/[a-z-]+\.webp$/);
        assert.ok(readFileSync(join(root, 'public', logo.foto)).length > 0, `${id}: falta ${logo.foto}.`);
        assert.ok(readFileSync(join(root, 'public', `${logo.foto}.json`), 'utf8').includes('"prompt"'), `${id}: falta el prompt de la foto.`);
      }
    }
  });

  test('las noticias enlazan a su fuente en otra pestaña; lo demás, dentro del sitio', () => {
    for (const columna of columnas) {
      for (const pieza of columna.piezas) {
        if (pieza.externo) assert.match(pieza.href, /^https?:\/\//, pieza.id);
        else assert.match(pieza.href, /^\//, pieza.id);
      }
    }
    assert.ok(columnas.find((c) => c.id === 'noticias')?.piezas.slice(1).every((p) => p.externo));
  });

  test('va después del h1, se puede parar y respeta el movimiento reducido', () => {
    const hero = source('src/components/home/hero.tsx');
    assert.ok(hero.indexOf('<h1') < hero.indexOf('<Mural'), 'nada antes del h1 (DESIGN.md, regla 1).');
    const mural = source('src/components/home/mural.tsx');
    assert.match(mural, /<ul aria-hidden>/, 'la segunda copia no se lee dos veces.');
    assert.match(mural, /tabIndex=\{tabIndex\}/, 'ni se recorre dos veces con el tabulador.');
    assert.match(mural, /<Link href=\{pieza\.href\} prefetch=\{false\}/, 'una tarjeta que entra y sale de la vista no precarga su página una y otra vez.');
    assert.match(source('src/components/home/mural-movimiento.tsx'), /aria-pressed=\{pausado\}/);
    const css = source('src/components/home/mural.css');
    assert.match(source('src/components/home/mural.tsx'), /import "\.\/mural\.css";/);
    assert.match(css, /\.mural:focus-within \.mural-columna/);
    assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*?\.mural-columna \{\s*animation: none !important;/);
  });

  test('las noticias automáticas siguen diciendo que lo son', () => {
    assert.match(source('src/components/home/mural.tsx'), /\{ETIQUETA_IA\}/);
  });
});
