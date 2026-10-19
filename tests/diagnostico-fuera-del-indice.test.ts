import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { navLinks } from '@/config/site';
import { CIERRE_SALIDAS } from '@/config/cierre';
import { NBI_DIAGNOSTICO, NBI_DIAGNOSTICO_TEXTO } from '@/config/nbi-diagnostico';

/**
 * Comprueba que la ruta antigua conserva su destino y que el sitio no la
 * anuncia en sus puntos de entrada. También protege el lenguaje de las salidas.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');
const precio = /€|\d+\s?€/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('la ruta de diagnóstico queda fuera del índice', () => {
  test('/diagnostico redirige a ianexora.com sin incluir un precio', () => {
    const config = source('next.config.ts');
    const bloque = config.match(/source:\s*"\/diagnostico",[\s\S]*?permanent:\s*(true|false)/);
    assert.ok(bloque, 'next.config.ts ya no redirige /diagnostico.');
    assert.match(bloque[0], /destination:\s*\n?\s*"https:\/\/ianexora\.com\/servicios\/diagnostico-de-procesos/);
    assert.doesNotMatch(bloque[0], precio);
  });

  test('ni el nav, ni el sitemap, ni llms.txt mencionan /diagnostico', () => {
    const hrefs: string[] = navLinks.map((l) => l.href);
    assert.ok(!hrefs.includes('/diagnostico'), 'el nav vuelve a enlazar /diagnostico.');
    assert.doesNotMatch(source('src/app/sitemap.ts'), /\/diagnostico/, 'el sitemap vuelve a listar /diagnostico.');
    assert.doesNotMatch(source('src/app/llms.txt/route.ts'), /\/diagnostico/, 'llms.txt vuelve a mencionarlo.');
  });

  test('ningún archivo de src importa la configuración retirada y la página no existe', () => {
    const intrusos = walk(join(root, 'src'))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .map((f) => relative(root, f))
      .filter((f) => /from ["']@\/config\/diagnostico["']/.test(source(f)));
    assert.deepEqual(intrusos, [], `Importan la configuración retirada: ${intrusos.join(', ')}`);
    assert.equal(statSync(join(root, 'src/app/diagnostico'), { throwIfNoEntry: false }), undefined);
  });

  test('las salidas del blog apuntan al diagnóstico de ianexora.com y no incluyen precios', () => {
    const trabajo = CIERRE_SALIDAS.find((s) => s.id === 'trabajo');
    assert.ok(trabajo);
    assert.ok(trabajo.href.startsWith(NBI_DIAGNOSTICO.url), 'la salida «trabajo» ya no apunta a ianexora.com.');
    for (const s of CIERRE_SALIDAS) assert.doesNotMatch(`${s.titulo} ${s.descripcion}`, precio, `la salida ${s.id} incluye un precio.`);
    assert.doesNotMatch(`${NBI_DIAGNOSTICO_TEXTO}`, /€|\d+\s?€|\b48\b|72 ?h/);
  });
});
