import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sitemap from '@/app/sitemap';
import { feedAlternates, navLinks, footerLinks, siteConfig } from '@/config/site';
import { getNoticias } from '@/lib/posts';

/**
 * 26-nov-2026, 9:17–9:19 (Kata): las noticias diarias son de su futuro blog
 * personal, no del blog de NBI. Las ya publicadas siguen vivas en /noticias
 * (200, en el sitemap, sin 410 ni redirección), pero fuera de la home, del
 * menú, del pie y del archivo de lecturas.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');

describe('las noticias, fuera de las superficies del blog de NBI', () => {
  test('ni el menú ni el pie enlazan a /noticias', () => {
    for (const link of [...navLinks, ...footerLinks]) assert.ok(!link.href.startsWith('/noticias'), link.href);
    assert.doesNotMatch(source('src/components/layout/footer.tsx'), /feeds\.noticias|RSS · noticias/);
  });

  test('la home no destaca noticias', () => {
    const home = source('src/app/page.tsx');
    assert.doesNotMatch(home, /getNoticias|getRadar|noticia del d[ií]a|\/noticias/i);
    assert.doesNotMatch(siteConfig.home.titular + siteConfig.home.subtitulo, /noticia/i);
  });

  test('el archivo de lecturas no enlaza a /noticias', () => {
    assert.doesNotMatch(source('src/app/lecturas/page.tsx'), /href="\/noticias"/);
  });

  test('solo /noticias anuncia su feed', () => {
    const urls = feedAlternates.types['application/rss+xml'].map((f) => f.url);
    assert.ok(!urls.some((u) => u.startsWith('/noticias')), urls.join(', '));
  });

  test('las páginas de noticias siguen en el sitemap', () => {
    const urls = sitemap().map((e) => e.url);
    assert.ok(urls.some((u) => u.endsWith('/noticias')), 'falta /noticias');
    assert.ok(urls.some((u) => /\/noticias\/\d{4}-\d{2}$/.test(u)), 'falta el archivo mensual de noticias');
  });

  test('ninguna noticia publicada se redirige ni se retira', () => {
    const migracion = source('src/config/migracion.ts') + source('next.config.ts');
    for (const n of getNoticias()) {
      const slug = n.permalink.replace(/^\//, '');
      assert.ok(!migracion.includes(`"/${slug}"`), `${slug} tiene una regla de redirección`);
    }
    assert.doesNotMatch(source('next.config.ts'), /source:\s*["']\/noticias/);
  });
});
