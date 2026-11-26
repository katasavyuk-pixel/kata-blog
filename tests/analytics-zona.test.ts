import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGEN_VERCEL, propsAnalytics, rewritesAnalytics, urlEnZona } from '@/config/analytics';
import { BASE_PATH } from '@/config/base-path';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

// 26-nov-2026: en ianexora.com la raíz es de NBI-WEB y solo /blog/* llega a
// este proyecto, así que el script de Vercel Analytics y sus eventos tienen
// que ir por /blog/_m/… y la URL de la página tiene que llevar /blog
// (src/config/analytics.ts).
describe('Vercel Analytics dentro de la zona /blog', () => {
  test('script y TODOS los endpoints van bajo /blog/_m, que NBI-WEB reenvía aquí', () => {
    assert.deepEqual(propsAnalytics(BASE_PATH), {
      scriptSrc: '/blog/_m/script.js',
      endpoint: '/blog/_m',
      viewEndpoint: '/blog/_m/view',
      eventEndpoint: '/blog/_m/event',
      sessionEndpoint: '/blog/_m/session',
    });
  });

  test('el rewrite lleva /blog/_m/… a /_vercel/insights/… del host de Vercel, con URL absoluta', () => {
    assert.equal(ORIGEN_VERCEL, 'https://kata-ivanovych-blog.vercel.app');
    assert.deepEqual(rewritesAnalytics(BASE_PATH), [
      {
        source: '/blog/_m/:path*',
        destination: 'https://kata-ivanovych-blog.vercel.app/_vercel/insights/:path*',
        basePath: false,
      },
    ]);
  });

  test('la URL que se manda lleva /blog, una sola vez', () => {
    assert.equal(urlEnZona('https://ianexora.com/glosario', '/blog'), 'https://ianexora.com/blog/glosario');
    assert.equal(urlEnZona('https://ianexora.com/', '/blog'), 'https://ianexora.com/blog');
    assert.equal(urlEnZona('https://ianexora.com/a?utm_source=x#y', '/blog'), 'https://ianexora.com/blog/a?utm_source=x#y');
    assert.equal(urlEnZona('https://ianexora.com/blog/glosario', '/blog'), 'https://ianexora.com/blog/glosario');
    assert.equal(urlEnZona('https://ianexora.com/blog', '/blog'), 'https://ianexora.com/blog');
    assert.equal(urlEnZona('https://ianexora.com/blogs', '/blog'), 'https://ianexora.com/blog/blogs');
    assert.equal(urlEnZona('no es una url', '/blog'), 'no es una url');
  });

  test('el layout usa AnalyticsZona y next.config.ts el rewrite', () => {
    const layout = readFileSync(join(root, 'src/app/layout.tsx'), 'utf8');
    assert.match(layout, /<AnalyticsZona \/>/);
    assert.doesNotMatch(layout, /<Analytics[ />]/, 'el layout no debe montar <Analytics> sin la configuración de la zona');
    assert.match(readFileSync(join(root, 'next.config.ts'), 'utf8'), /beforeFiles: rewritesAnalytics\(BASE_PATH\)/);
    const zona = readFileSync(join(root, 'src/components/analytics/analytics-zona.tsx'), 'utf8');
    assert.match(zona, /beforeSend=\{conBasePath\}/);
    assert.match(zona, /\{\.\.\.PROPS\}/);
  });
});
