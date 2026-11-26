import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DESTINO, HOSTS_ANTIGUOS, POSTS_RETIRADOS, REGLAS_HOST_ANTIGUO, redireccionesDeHostsAntiguos } from '@/config/migracion';
import { BASE_PATH, conBase, htmlConBase, rutaInterna } from '@/config/base-path';
import { siteConfig } from '@/config/site';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

// La migración del 26-nov-2026: el blog es ianexora.com/blog.
describe('migración a ianexora.com/blog', () => {
  test('la zona vive bajo /blog y la URL pública por defecto es la de NBI', () => {
    assert.equal(BASE_PATH, '/blog');
    assert.match(readFileSync(join(root, 'next.config.ts'), 'utf8'), /basePath: BASE_PATH/);
    if (!process.env.NEXT_PUBLIC_SITE_URL) assert.equal(siteConfig.url, 'https://ianexora.com/blog');
  });

  test('los hosts antiguos redirigen con 301, fuera del base path, solo por su Host', () => {
    assert.deepEqual([...HOSTS_ANTIGUOS], ['kata.ianexora.com', 'blog.ianexora.com', 'www.blog.ianexora.com']);
    const reglas = redireccionesDeHostsAntiguos();
    assert.equal(reglas.length, HOSTS_ANTIGUOS.length * REGLAS_HOST_ANTIGUO.length);
    for (const r of reglas) {
      assert.equal(r.statusCode, 301);
      assert.equal(r.basePath, false);
      assert.equal(r.has[0].type, 'host');
    }
  });

  test('cada destino es absoluto y final: un solo salto', () => {
    for (const r of REGLAS_HOST_ANTIGUO) {
      assert.match(r.destination, /^https:\/\/ianexora\.com\//, `${r.source} no va a ianexora.com`);
      assert.doesNotMatch(r.destination, /ianexora\.com\/blog\/blog\//, `${r.source} deja un segundo salto`);
    }
    // La última regla es el comodín: nada se queda sin destino.
    assert.equal(REGLAS_HOST_ANTIGUO.at(-1)?.source, '/:path+');
    assert.equal(REGLAS_HOST_ANTIGUO[0].destination, DESTINO);
  });

  test('los tres posts personales salen con 301 y ya no están en content/posts', () => {
    assert.deepEqual(POSTS_RETIRADOS.map((r) => r.source), ['/por-que-hago-esto', '/lo-que-me-cuesta-avanzar', '/bienvenida']);
    const fuentes = REGLAS_HOST_ANTIGUO.map((r) => r.source);
    for (const r of POSTS_RETIRADOS) {
      assert.ok(fuentes.indexOf(`/blog${r.source}`) < fuentes.indexOf('/blog/:path+'), `${r.source} cae en el comodín antes de su regla`);
    }
  });

  test('las rutas internas no se escapan de la zona', () => {
    assert.equal(conBase('/api/subscribe'), '/blog/api/subscribe');
    assert.equal(conBase('/blog/x'), '/blog/x');
    assert.equal(conBase('https://ianexora.com/contacto'), 'https://ianexora.com/contacto');
    assert.equal(rutaInterna('/blog/que-es-rag'), '/que-es-rag');
    assert.equal(rutaInterna('/blog'), '/lecturas');
    assert.equal(rutaInterna('/sobre-mi'), 'https://ianexora.com/sobre-katalin-savyuk');
    assert.equal(htmlConBase('<a href="/blog/que-es-rag">x</a><img src="/covers/a.webp">'), '<a href="/blog/que-es-rag">x</a><img src="/blog/covers/a.webp">');
  });
});
