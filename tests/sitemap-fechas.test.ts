import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sitemap from '@/app/sitemap';
import { REVISADO } from '@/config/revisiones';
import { glossary } from '@/lib/glossary';

/**
 * El `lastmod` de cada URL es el día en que cambió su contenido, nunca el
 * instante del build.
 *
 * El 17-oct-2026 una auditoría externa encontró 18 de 57 URLs con la hora del
 * build: cada despliegue le decía a Google que la mitad del sitio había
 * cambiado, y un buscador aprende a ignorar un dato que siempre dice «ahora».
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const DIA = /^\d{4}-\d{2}-\d{2}$/;
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());

describe('las fechas del sitemap', () => {
  const entradas = sitemap();

  test('cada lastmod es un día, y no del futuro', () => {
    for (const e of entradas) {
      if (e.lastModified === undefined) continue;
      assert.match(String(e.lastModified), DIA, `${e.url}: ${String(e.lastModified)} no es un día AAAA-MM-DD.`);
      assert.ok(String(e.lastModified) <= hoy, `${e.url}: ${String(e.lastModified)} es posterior a hoy.`);
    }
  });

  test('ninguna URL comparte la hora del build, porque ninguna lleva hora', () => {
    assert.ok(entradas.every((e) => e.lastModified === undefined || !String(e.lastModified).includes('T')));
  });

  test('sin changefreq ni priority: Google los ignora y eran la misma suposición en todas', () => {
    for (const e of entradas) {
      assert.equal('changeFrequency' in e, false, e.url);
      assert.equal('priority' in e, false, e.url);
    }
  });

  test('el generador no inventa fechas con new Date()', () => {
    const fuente = readFileSync(join(root, 'src/app/sitemap.ts'), 'utf8');
    assert.doesNotMatch(fuente, /new Date\(\s*\)/);
  });

  test('las páginas escritas a mano tienen su fecha de revisión, y es válida', () => {
    for (const [ruta, fecha] of Object.entries(REVISADO)) {
      assert.match(fecha, DIA, ruta);
      assert.ok(fecha <= hoy, `${ruta}: revisada en el futuro (${fecha}).`);
      assert.ok(entradas.some((e) => e.url.endsWith(ruta) && e.lastModified === fecha), `${ruta} no lleva su fecha de revisión en el sitemap.`);
    }
  });

  test('cada término del glosario lleva su fecha', () => {
    for (const [id, termino] of Object.entries(glossary)) assert.match(termino.updated, DIA, id);
  });
});
