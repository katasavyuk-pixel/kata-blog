import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { IMAGEN_OG_POR_DEFECTO, siteConfig, withOpenGraph } from '@/config/site';
import { metadataDeMes, mesesPublicados } from '@/lib/mensual';

/**
 * La tarjeta de un enlace compartido dice lo que dice la página.
 *
 * Next fusiona la metadata por segmento sin mezclar `openGraph` ni `twitter`:
 * quien declara uno lo sustituye entero, y quien no declara ninguno hereda el
 * del layout. El 17-oct-2026 una auditoría externa encontró el resultado: 11
 * URLs con og:title «Kata Ivanovych», 34 con ese twitter:title, 25 sin imagen y
 * 10 con el og:url de la home. Desde entonces el layout no fija título, texto
 * ni url, y cada página construye sus bloques con `withOpenGraph`.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');

function paginas(dir: string, out: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) paginas(ruta, out);
    else if (nombre === 'page.tsx') out.push(relative(root, ruta));
  }
  return out;
}

describe('withOpenGraph', () => {
  const meta = withOpenGraph('/blog', { title: 'Blog', description: 'Lo que escribo.' });

  test('og:title y twitter:title son el <title> de la página', () => {
    const titulo = `Blog · ${siteConfig.name}`;
    assert.equal((meta.openGraph as { title: string }).title, titulo);
    assert.equal((meta.twitter as { title: string }).title, titulo);
  });

  test('con un título absoluto, la tarjeta lleva ese título entero', () => {
    const abs = withOpenGraph('/x', { title: { absolute: 'Un título entero' }, description: 'd' });
    assert.equal((abs.openGraph as { title: string }).title, 'Un título entero');
  });

  test('og:url es la ruta de la página, no la home', () => {
    assert.equal((meta.openGraph as { url: string }).url, '/blog');
  });

  test('sin imagen propia, la tarjeta por defecto, en og y en twitter', () => {
    assert.deepEqual((meta.openGraph as { images: unknown }).images, [IMAGEN_OG_POR_DEFECTO]);
    assert.deepEqual((meta.twitter as { images: unknown }).images, [IMAGEN_OG_POR_DEFECTO.url]);
  });

  test('las páginas de cada mes de noticias pasan por ella', () => {
    for (const mes of mesesPublicados()) {
      const m = metadataDeMes(mes);
      assert.ok(m, mes);
      assert.equal((m.twitter as { title: string }).title, (m.openGraph as { title: string }).title, mes);
      assert.ok((m.openGraph as { images?: unknown }).images, `${mes} sin imagen`);
    }
  });
});

describe('el layout y las páginas', () => {
  test('el layout no fija título, texto ni url en openGraph o twitter', () => {
    const layout = source('src/app/layout.tsx');
    for (const bloque of ['openGraph', 'twitter']) {
      const cuerpo = layout.match(new RegExp(`\\n  ${bloque}: \\{([\\s\\S]*?)\\n  \\}`))?.[1];
      assert.ok(cuerpo !== undefined, `No encuentro el bloque ${bloque} del layout.`);
      assert.doesNotMatch(cuerpo, /\btitle:|\bdescription:|\burl:/, `El layout vuelve a fijar algo en ${bloque}.`);
    }
  });

  test('ninguna página escribe a mano su openGraph o su twitter', () => {
    // /diagnostico redirige (308) a ianexora.com y su página no se sirve.
    const excepciones = new Set(['src/app/diagnostico/page.tsx']);
    for (const pagina of paginas(join(root, 'src/app'))) {
      if (excepciones.has(pagina)) continue;
      assert.doesNotMatch(source(pagina), /\bopenGraph:\s*\{|\btwitter:\s*\{/, `${pagina} construye su tarjeta a mano: usa withOpenGraph.`);
    }
  });
});
