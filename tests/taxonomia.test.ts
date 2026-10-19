import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RADAR_AXES, RADAR_AXIS_KEYS, etiquetaDeEje } from '@/config/taxonomy';

/**
 * Los ejes de las noticias son una lista cerrada.
 *
 * El eje de un ítem no lo decide el modelo: es el de su fuente
 * (`config/radar-sources.json`). Así que lo que hay que vigilar no es lo que se
 * escribe en una edición, sino que las tres piezas que hablan de ejes —la lista,
 * las fuentes y lo que se le pide al modelo— digan lo mismo.
 */

const ROOT = join(import.meta.dirname, '..');
type Fuente = { name: string; medio?: string; url: string; axis: string; lang: string };
const { sources } = JSON.parse(readFileSync(join(ROOT, 'config/radar-sources.json'), 'utf8')) as { sources: Fuente[] };
const workflow = readFileSync(join(ROOT, '.github/workflows/noticias-diarias.yml'), 'utf8');
const plantilla = readFileSync(join(ROOT, 'content/_templates/noticias.mdx'), 'utf8');

describe('ejes de las noticias', () => {
  test('tecnología va aparte de IA', () => {
    assert.deepEqual([...RADAR_AXIS_KEYS], ['ia', 'tecnologia', 'negocio', 'economia', 'geopolitica']);
    assert.notEqual(RADAR_AXES.ia, RADAR_AXES.tecnologia);
    assert.doesNotMatch(RADAR_AXES.ia, /tecnolog/i, 'la etiqueta de IA ya no cubre las dos');
  });

  test('cada eje tiene su etiqueta, y no hay etiquetas de más', () => {
    assert.deepEqual(Object.keys(RADAR_AXES).sort(), [...RADAR_AXIS_KEYS].sort());
    for (const eje of RADAR_AXIS_KEYS) assert.ok(RADAR_AXES[eje].trim(), eje);
  });

  test('un eje de una edición antigua se enseña tal cual, no se pierde', () => {
    assert.equal(etiquetaDeEje('economia'), 'Economía');
    assert.equal(etiquetaDeEje('seguridad'), 'seguridad');
  });

  test('toda fuente declara un eje de la lista', () => {
    for (const fuente of sources) {
      assert.ok((RADAR_AXIS_KEYS as readonly string[]).includes(fuente.axis), `${fuente.name}: eje «${fuente.axis}»`);
    }
  });

  test('ningún eje se queda sin fuentes: un eje vacío es una promesa que no se cumple', () => {
    for (const eje of RADAR_AXIS_KEYS) {
      assert.ok(sources.some((fuente) => fuente.axis === eje), `ninguna fuente alimenta «${eje}»`);
    }
  });

  test('al modelo se le nombran los mismos ejes, en el mismo orden', () => {
    const lista = RADAR_AXIS_KEYS.join(', ');
    assert.ok(workflow.includes(`(${lista})`), `el workflow no nombra (${lista})`);
    assert.ok(plantilla.includes(RADAR_AXIS_KEYS.join('/')), 'la plantilla no nombra los mismos ejes');
  });
});

describe('fuentes', () => {
  test('cada una tiene nombre, medio y una dirección https distinta', () => {
    assert.equal(new Set(sources.map((f) => f.url)).size, sources.length, 'hay una dirección repetida');
    assert.equal(new Set(sources.map((f) => f.name)).size, sources.length, 'hay un nombre repetido');
    for (const fuente of sources) {
      assert.match(fuente.url, /^https:\/\//, fuente.name);
      assert.ok(fuente.medio?.trim(), `${fuente.name}: falta cómo se nombra el medio en un texto`);
    }
  });

  test('no vuelve el feed de Eurostat que solo avisa de tablas actualizadas', () => {
    // El 13-oct-2026 sus diez titulares del día eran «XXX - "Dataset: updated data"»:
    // todo el eje de economía era ruido.
    for (const fuente of sources) assert.doesNotMatch(fuente.url, /statistics-update\.rss/, fuente.name);
  });
});
