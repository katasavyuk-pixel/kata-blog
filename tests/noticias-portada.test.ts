import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPortada, type PortadaPost } from '@/lib/noticias-portada';
import { rssResponse } from '@/lib/feed';

/**
 * La portada de /noticias, el archivo plegado, los permalinks y el RSS.
 *
 * `buildPortada` decide qué dice la página sobre el día (artículo nuevo o
 * «último completo»), así que es la parte que puede mentir sin que nada más
 * falle. Los permalinks y el RSS son contrato con lectores y buscadores:
 * ninguno puede cambiar por añadir el artículo diario.
 */

const ROOT = join(import.meta.dirname, '..');

const post = (slug: string, date: string, over: Partial<PortadaPost> = {}): PortadaPost => ({
  slug,
  permalink: `/blog/${slug}`,
  title: `Título ${slug}`,
  description: `Descripción ${slug}`,
  date,
  ...over,
});

const lead = (date: string) => post(`noticia-${date}`, date, { protagonista: true });
const edition = (date: string) => post(`noticias-${date}`, date);

describe('portada: noticia protagonista y novedades', () => {
  test('día normal: artículo y edición de hoy; la portada marca el artículo como vigente', () => {
    const p = buildPortada([edition('2026-10-09'), lead('2026-10-09'), edition('2026-10-08')]);
    assert.equal(p.lead?.slug, 'noticia-2026-10-09');
    assert.equal(p.latestEdition?.slug, 'noticias-2026-10-09');
    assert.equal(p.leadIsCurrent, true);
    assert.equal(p.lastEditedAt, '2026-10-09');
  });

  test('día insuficiente: la edición es más nueva que el artículo → se conserva el último completo y se avisa', () => {
    const p = buildPortada([edition('2026-10-09'), lead('2026-10-07'), edition('2026-10-08')]);
    assert.equal(p.lead?.slug, 'noticia-2026-10-07');
    assert.equal(p.leadIsCurrent, false);
    assert.equal(p.latestEdition?.slug, 'noticias-2026-10-09');
  });

  test('la fecha real de última edición sale de `updated` si existe, y es la mayor de las dos', () => {
    const p = buildPortada([
      lead('2026-10-07'),
      post('noticias-2026-10-08', '2026-10-08'),
      post('noticias-2026-10-06', '2026-10-06'),
    ]);
    assert.equal(p.lastEditedAt, '2026-10-08');
    const q = buildPortada([post('noticia-2026-10-07', '2026-10-07', { protagonista: true, updated: '2026-10-09' }), edition('2026-10-08')]);
    assert.equal(q.lastEditedAt, '2026-10-09');
  });

  test('antes del primer artículo: sin protagonista, solo la edición', () => {
    const p = buildPortada([edition('2026-10-08')]);
    assert.equal(p.lead, null);
    assert.equal(p.leadIsCurrent, false);
    assert.equal(p.latestEdition?.slug, 'noticias-2026-10-08');
  });

  test('sin nada publicado', () => {
    const p = buildPortada([]);
    assert.deepEqual([p.lead, p.latestEdition, p.lastEditedAt, p.archive], [null, null, null, []]);
  });
});

describe('archivo plegado', () => {
  const posts = [
    edition('2026-10-09'),
    lead('2026-10-09'),
    edition('2026-10-08'),
    lead('2026-10-08'),
    edition('2026-10-07'),
  ];

  test('el archivo es todo lo que no está en portada, de más nuevo a más viejo', () => {
    const { archive } = buildPortada(posts);
    assert.deepEqual(
      archive.map((a) => a.slug),
      ['noticias-2026-10-08', 'noticia-2026-10-08', 'noticias-2026-10-07'],
    );
  });

  test('ni el protagonista ni la edición de portada se repiten en el archivo', () => {
    const { archive, lead: l, latestEdition } = buildPortada(posts);
    const slugs = archive.map((a) => a.slug);
    assert.ok(!slugs.includes(l!.slug));
    assert.ok(!slugs.includes(latestEdition!.slug));
    assert.equal(new Set(slugs).size, slugs.length);
  });

  test('la página usa <details> sin atributo open (plegado por defecto) y no depende de JS', () => {
    const page = readFileSync(join(ROOT, 'src', 'app', 'noticias', 'page.tsx'), 'utf8');
    const details = page.match(/<details\b[^>]*>/)?.[0] ?? '';
    assert.ok(details, 'la página debe usar <details>');
    assert.doesNotMatch(details, /\bopen\b/);
    assert.doesNotMatch(page, /^"use client"/m);
    assert.match(page, /<summary\b/);
  });
});

describe('permalinks y RSS conservados', () => {
  test('los ficheros de ediciones históricas siguen donde estaban (su ruta es /blog/<slug>)', () => {
    for (const slug of ['radar-2026-07-21', 'noticias-2026-08-23', 'noticias-2026-10-08']) {
      assert.ok(existsSync(join(ROOT, 'content', 'posts', `${slug}.mdx`)), `falta ${slug}`);
    }
    const velite = readFileSync(join(ROOT, 'velite.config.ts'), 'utf8');
    assert.match(velite, /permalink: `\/blog\/\$\{slug\}`/);
  });

  test('las redirecciones de /radar siguen en next.config', () => {
    const config = readFileSync(join(ROOT, 'next.config.ts'), 'utf8');
    assert.match(config, /source: "\/radar"/);
    assert.match(config, /source: "\/blog\/tag\/radar"/);
  });

  test('el RSS lleva ediciones y artículos con su permalink y la misma forma de item', async () => {
    const posts = [lead('2026-10-09'), edition('2026-10-09'), edition('2026-10-08')].map((p) => ({
      ...p,
      excerpt: 'Resumen',
      tags: ['radar'],
    }));
    const response = rssResponse({
      posts: posts as never,
      title: 'Noticias',
      description: 'd',
      feedPath: '/noticias/feed.xml',
      sitePath: '/noticias',
    });
    assert.match(response.headers.get('Content-Type') ?? '', /application\/rss\+xml/);
    const xml = await response.text();
    for (const p of posts) assert.ok(xml.includes(`${p.permalink}`), `el feed no lleva ${p.permalink}`);
    assert.equal((xml.match(/<item>/g) ?? []).length, 3);
    // RSS 2.0 publishes the channel's page link; the feed URL is declared in
    // the route's metadata and `feedLinks` is not serialized by this library.
    assert.ok(xml.includes('<link>https://kata.ianexora.com/noticias</link>'));
  });

  test('la ruta del feed sigue sirviendo getNoticias (ediciones y artículos)', () => {
    const route = readFileSync(join(ROOT, 'src', 'app', 'noticias', 'feed.xml', 'route.ts'), 'utf8');
    assert.match(route, /posts: getNoticias\(\)/);
  });
});
