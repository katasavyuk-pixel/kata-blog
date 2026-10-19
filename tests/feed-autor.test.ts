import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { conDcCreator, rssResponse } from '@/lib/feed';
import { getEditoriales } from '@/lib/posts';
import { siteConfig } from '@/config/site';
import { GET as bitacora } from '@/app/bitacora/feed.xml/route';

/**
 * Cada ítem de un feed dice quién lo firma (auditoría del 17-oct-2026: los 21
 * ítems de /feed.xml salían sin autor, porque la librería solo escribe
 * `<author>` con un correo). Va como `dc:creator`, con el nombre y sin correo.
 */
const cuenta = (xml: string, re: RegExp) => (xml.match(re) ?? []).length;

describe('el autor en los feeds', () => {
  test('cada ítem del feed principal lleva su dc:creator', async () => {
    const posts = getEditoriales();
    const xml = await rssResponse({ posts, title: 't', description: 'd', feedPath: '/feed.xml' }).text();
    assert.ok(posts.length > 0);
    assert.equal(cuenta(xml, /<item>/g), cuenta(xml, /<dc:creator>/g));
    assert.match(xml, new RegExp(`<dc:creator><!\\[CDATA\\[${siteConfig.author.name}\\]\\]></dc:creator>`));
    assert.match(xml, /xmlns:dc="http:\/\/purl\.org\/dc\/elements\/1\.1\/"/);
  });

  test('y cada entrada de la bitácora', async () => {
    const xml = await bitacora().text();
    assert.equal(cuenta(xml, /<item>/g), cuenta(xml, /<dc:creator>/g));
  });

  test('sin correo, y un nombre raro no rompe el XML', () => {
    const xml = conDcCreator('<rss version="2.0"><channel><item><title>a</title></item></channel></rss>', ['A ]]> B']);
    assert.match(xml, /<dc:creator><!\[CDATA\[A \]\]\]\]><!\[CDATA\[> B\]\]><\/dc:creator>/);
    assert.match(xml, /xmlns:dc=/);
    assert.doesNotMatch(xml, /@/);
  });
});
