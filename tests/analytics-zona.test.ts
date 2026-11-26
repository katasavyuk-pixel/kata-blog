import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { propsAnalytics, raizAnalytics, rewritesAnalytics } from '@/config/analytics';
import { BASE_PATH } from '@/config/base-path';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

// 26-nov-2026: en ianexora.com la raíz es de NBI-WEB y solo /blog/* llega a
// este proyecto, así que el script de Vercel Analytics y sus eventos tienen
// que ir por /blog/<hash>/… (src/config/analytics.ts).
describe('Vercel Analytics dentro de la zona /blog', () => {
  test('la raíz sale del hash que pone Vercel y, sin él, es /_vercel/insights', () => {
    assert.equal(raizAnalytics({ NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH: '/74f3103ea9389461' }), '/74f3103ea9389461');
    assert.equal(raizAnalytics({ NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH: '74f3103ea9389461/' }), '/74f3103ea9389461');
    assert.equal(raizAnalytics({}), '/_vercel/insights');
    assert.equal(raizAnalytics({ NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH: ' ' }), '/_vercel/insights');
  });

  test('script y eventos van bajo /blog, que NBI-WEB reenvía a este proyecto', () => {
    assert.deepEqual(propsAnalytics('/blog', '/74f3103ea9389461'), {
      scriptSrc: '/blog/74f3103ea9389461/script.js',
      endpoint: '/blog/74f3103ea9389461',
    });
  });

  test('el rewrite lleva /blog/<hash>/… a la ruta raíz del host de Vercel (URL absoluta: Next no admite otra fuera del base path)', () => {
    assert.deepEqual(rewritesAnalytics('/blog', '/74f3103ea9389461'), [
      {
        source: '/blog/74f3103ea9389461/:path*',
        destination: 'https://kata-ivanovych-blog.vercel.app/74f3103ea9389461/:path*',
        basePath: false,
      },
    ]);
  });

  test('el layout y next.config.ts usan esta configuración', () => {
    assert.match(readFileSync(join(root, 'src/app/layout.tsx'), 'utf8'), /<Analytics \{\.\.\.propsAnalytics\(BASE_PATH\)\} \/>/);
    assert.match(readFileSync(join(root, 'next.config.ts'), 'utf8'), /beforeFiles: rewritesAnalytics\(BASE_PATH\)/);
  });
});

test('el base path de Analytics es el de la zona', () => {
  assert.equal(propsAnalytics(BASE_PATH, '/x').endpoint, '/blog/x');
});
