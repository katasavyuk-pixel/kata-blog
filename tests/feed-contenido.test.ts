import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { contenidoDelItem, rssResponse } from '@/lib/feed';
import { getEditoriales } from '@/lib/posts';
import { siteConfig } from '@/config/site';

/**
 * Lo que un lector de feeds (Feedly, Inoreader, Flipboard) enseña de cada
 * pieza: su portada, la respuesta corta y lo que te llevas, y el enlace. Hasta
 * el 17-oct-2026 era un extracto de ~260 caracteres cortado a media palabra y
 * sin imagen.
 */
const cuenta = (xml: string, re: RegExp) => (xml.match(re) ?? []).length;

const pieza = {
  title: 'Título',
  excerpt: 'El extracto',
  respuesta: 'La respuesta <corta> & clara',
  te_llevas: ['Una idea', 'Otra idea'],
  cover: { src: '/static/portada.webp', width: 1672, height: 941, blurDataURL: '', blurWidth: 8, blurHeight: 5 },
  coverAlt: 'Una "portada"',
};

describe('el contenido de cada ítem del feed', () => {
  test('portada, respuesta corta, lo que te llevas y el enlace, escapados', () => {
    const html = contenidoDelItem(pieza, 'https://kata.ianexora.com/blog/x');
    assert.match(html, /<img src="https:\/\/kata\.ianexora\.com\/static\/portada\.webp" alt="Una &quot;portada&quot;" width="1672" height="941" \/>/);
    assert.match(html, /<p>La respuesta &lt;corta&gt; &amp; clara<\/p>/);
    assert.match(html, /<ul><li>Una idea<\/li><li>Otra idea<\/li><\/ul>/);
    assert.match(html, /<a href="https:\/\/kata\.ianexora\.com\/blog\/x">Sigue leyendo en /);
  });

  test('sin respuesta corta ni portada, el extracto y el enlace', () => {
    const html = contenidoDelItem({ ...pieza, respuesta: undefined, te_llevas: [], cover: undefined }, 'https://kata.ianexora.com/blog/x');
    assert.doesNotMatch(html, /<img|<ul>/);
    assert.match(html, /<p>El extracto<\/p>/);
  });

  test('el feed principal: cada ítem con su imagen y el enlace a sí mismo', async () => {
    const posts = getEditoriales();
    const xml = await rssResponse({ posts, title: 't', description: 'd', feedPath: '/feed.xml' }).text();
    const conPortada = posts.filter((post) => post.cover).length;
    assert.ok(conPortada > 0);
    assert.equal(cuenta(xml, /<enclosure [^>]*type="image\/[a-z]+"/g), conPortada);
    assert.match(xml, new RegExp(`<atom:link href="${siteConfig.url}/feed\\.xml" rel="self" type="application/rss\\+xml"/>`));
  });
});
