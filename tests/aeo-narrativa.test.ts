import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tagHref } from '@/config/taxonomy';
import { withOpenGraph } from '@/config/site';

/**
 * Lo que dejó el diagnóstico AEO del 11-oct-2026 (A7), para que no vuelva.
 *
 * 1. Un chip de etiqueta no apunta a una URL que solo redirige.
 * 2. Un listado no hereda el `og:url` de la raíz: compartir /blog o /noticias
 *    atribuía el enlace a la home.
 * 3. Los artículos no dicen que el diagnóstico de NBI «devuelve una estimación»
 *    ni citan una banda de automatización: no hay un diagnóstico online ni una
 *    cifra publicada, y un ROI sin medición no se afirma.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(`${root}${file}`, 'utf8');

describe('etiquetas', () => {
  test('«radar» va a /noticias, no a una ruta que redirige', () => {
    assert.equal(tagHref('radar'), '/noticias');
  });
  test('el resto sigue en /blog/tag/<tag>, con la etiqueta codificada', () => {
    assert.equal(tagHref('automatización'), '/blog/tag/automatizaci%C3%B3n');
    assert.equal(tagHref('roi'), '/blog/tag/roi');
  });
  test('las dos superficies que pintan chips usan el helper', () => {
    for (const f of ['src/components/blog/tag-list.tsx', 'src/app/blog/[slug]/page.tsx']) {
      assert.match(source(f), /tagHref\(/, `${f} vuelve a construir /blog/tag/ a mano.`);
      assert.doesNotMatch(source(f), /`\/blog\/tag\/\$\{encodeURIComponent/, `${f} vuelve a construir /blog/tag/ a mano.`);
    }
  });
});

describe('og:url de los listados', () => {
  test('withOpenGraph pone la ruta de la página, no la raíz', () => {
    const m = withOpenGraph('/blog', { title: 'Archivo', description: 'x' });
    assert.equal((m.openGraph as { url: string }).url, '/blog');
    assert.match(String((m.openGraph as { title: string }).title), /^Archivo · /);
  });
  test('cada listado con canónica propia declara su openGraph con esa misma ruta', () => {
    for (const ruta of ['blog', 'noticias', 'sistemas', 'marketplace', 'guias', 'reflexiones', 'herramientas', 'sobre-mi', 'trabaja-con-nbi', 'empieza-aqui', 'newsletter', 'glosario']) {
      const f = `src/app/${ruta}/page.tsx`;
      assert.match(source(f), new RegExp(`withOpenGraph\\("/${ruta}"`), `${f} hereda el og:url de la raíz.`);
    }
  });
});

describe('lo que los artículos dicen del diagnóstico', () => {
  test('ninguno cita una banda de automatización ni un «diagnóstico online»', () => {
    for (const f of [
      'content/posts/antes-del-tms-tu-inbox.mdx',
      'content/posts/que-proceso-automatizar-primero.mdx',
    ]) {
      assert.doesNotMatch(source(f), /70[–-]85|banda pública|diagnóstico online/i, `${f} afirma algo que ianexora.com ya no publica.`);
    }
  });
  test('el artículo del TMS lleva su aviso de que parte de un caso de transporte', () => {
    assert.match(source('content/posts/antes-del-tms-tu-inbox.mdx'), /Escrito en agosto, con un caso de transporte/);
  });
});
