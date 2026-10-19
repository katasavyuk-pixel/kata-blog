import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { allPosts } from '@/lib/posts';
import { faqJsonLd } from '@/lib/jsonld';

/**
 * Las preguntas frecuentes de un artículo.
 *
 * Se declaran una vez, en el frontmatter (`faq`), y de ahí salen el bloque que
 * ve el lector y el `FAQPage` que lee una máquina. Lo que este test protege es
 * que sigan siendo lo mismo: marcar como FAQ algo que la página no enseña es
 * el spam estructurado que src/lib/jsonld.ts lleva escrito que no se hace.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');

describe('preguntas frecuentes', () => {
  test('el bloque visible y los datos estructurados salen del mismo array', () => {
    const pagina = source('src/app/blog/[slug]/page.tsx');
    assert.match(pagina, /<Faq items=\{post\.faq\} \/>/, 'la página ya no pinta el bloque de preguntas');
    assert.match(
      pagina,
      /post\.faq\.length > 0 \? \[faqJsonLd\(post\.faq\)\] : \[\]/,
      'el FAQPage ya no sale de post.faq, o se emite sin preguntas',
    );
  });

  test('el bloque enseña la pregunta y la respuesta tal cual, sin plegarlas', () => {
    const componente = source('src/components/blog/faq.tsx');
    assert.match(componente, /if \(items\.length === 0\) return null;/);
    assert.match(componente, /\{item\.q\}/);
    assert.match(componente, /\{item\.a\}/);
    assert.doesNotMatch(componente, /<details|<summary/, 'una respuesta plegada es una respuesta que hay que ir a buscar');
  });

  test('el FAQPage lleva las mismas palabras', () => {
    const items = [{ q: '¿Qué es un token?', a: 'La unidad en la que un modelo cuenta el texto.' }];
    const data = faqJsonLd(items) as { '@type': string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    assert.equal(data['@type'], 'FAQPage');
    assert.equal(data.mainEntity[0].name, items[0].q);
    assert.equal(data.mainEntity[0].acceptedAnswer.text, items[0].a);
  });

  test('cada pregunta publicada es una pregunta, y cada respuesta dice algo', () => {
    for (const post of allPosts) {
      const vistas = new Set<string>();
      for (const { q, a } of post.faq) {
        assert.match(q, /^¿.+\?$/, `${post.slug}: «${q}» no está escrita como pregunta.`);
        assert.ok(a.trim().length >= 40, `${post.slug}: la respuesta a «${q}» es demasiado corta para servir sola.`);
        assert.equal(vistas.has(q), false, `${post.slug}: «${q}» está repetida.`);
        vistas.add(q);
      }
    }
  });
});
