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
    const firmadas = leerPortada().firmadas;
    const enlaces = new Set(entradasBitacora.flatMap((entrada) => entrada.enlace.startsWith("/blog/") ? [entrada.enlace.slice("/blog/".length).split(/[?#]/)[0]] : []));
    const postsNuevos = firmadas.filter((post) => !enlaces.has(post.slug));
    assert.equal(bitacora?.total, entradasBitacora.length + postsNuevos.length);
    assert.equal(bitacora?.piezas[0].id, firmadas[0].slug, "la publicación más reciente encabeza la bitácora real.");
    assert.ok(bitacora?.piezas.some((pieza) => pieza.id === firmadas[0].slug), "la publicación más reciente aparece en la columna.");
  });

  test('combina entradas y publicaciones por día, con publicaciones primero en empate', () => {
    const portada = leerPortada();
    const ultimaEntrada = entradasBitacora[0];
    const postMismoDia = { ...portada.firmadas[0], slug: "post-mismo-dia", permalink: "/blog/post-mismo-dia", date: `${ultimaEntrada.fecha.slice(0, 10)}T12:00:00.000Z`, title: "Post del mismo día" };
    const bitacora = columnasDelMural({ ...portada, firmadas: [postMismoDia] }).find((columna) => columna.id === "bitacora");
    assert.equal(bitacora?.piezas[0].id, "post-mismo-dia");
    assert.equal(bitacora?.piezas[0].kicker, `${new Date(postMismoDia.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "")} · Publicado`);
    assert.equal(bitacora?.total, entradasBitacora.length + 1);
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

  test('el top es estático, igualado, con portada y sin control de movimiento', () => {
    const hero = source('src/components/home/hero.tsx');
    assert.ok(hero.indexOf('<h1') < hero.indexOf('<Mural'), 'nada antes del h1 (DESIGN.md, regla 1).');
    const mural = source('src/components/home/mural.tsx');
    assert.match(mural, /grid items-stretch gap-3 sm:grid-cols-3/);
    assert.match(mural, /aspect-video/);
    assert.match(mural, /NuevoBadge/);
    assert.match(mural, /min-w-0 flex-1 truncate/);
    assert.match(mural, /shrink-0 whitespace-nowrap/);
    assert.match(mural, /tituloEnFrase\(pieza\.titulo\)/);
    assert.match(mural, /fecha=\{/);
    assert.match(mural, /bg-surface-2/);
    assert.doesNotMatch(mural, /MuralMovimiento|Parar el movimiento|mural-columna|animation/);
    assert.doesNotMatch(hero, /MuralMovimiento|Parar el movimiento/);
  });

  test('las noticias automáticas siguen diciendo que lo son', () => {
    assert.match(source('src/components/portada/portada.tsx'), /primera \? etiquetaIa\(primera\.articulo\) : ETIQUETA_IA/);
  });
});
