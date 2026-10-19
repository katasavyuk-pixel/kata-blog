import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { GUIAS_NBI, PUENTE_POR_POST, puenteDe } from '@/config/puentes';
import { allPosts, esAutomatico, esIndexable } from '@/lib/posts';

/**
 * Cada artículo sigue en una guía de ianexora.com (brief del 17-oct-2026), y
 * solo en una guía: la frontera Kata/NBI (7-oct) deja la venta
 * en NBI, así que un puente nunca lleva a servicios, precios ni diagnóstico.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');

describe('los puentes a ianexora.com', () => {
  test('cada artículo escrito a mano e indexable tiene el suyo', () => {
    for (const post of allPosts.filter((p) => esIndexable(p) && !esAutomatico(p))) {
      assert.ok(PUENTE_POR_POST[post.slug], `${post.slug} no tiene puente.`);
    }
  });

  test('ninguno apunta a un artículo que ya no existe', () => {
    const slugs = new Set(allPosts.map((p) => p.slug));
    for (const slug of Object.keys(PUENTE_POR_POST)) assert.ok(slugs.has(slug), `${slug} no es un artículo.`);
  });

  test('solo guías, con la UTM del blog', () => {
    for (const guia of Object.values(GUIAS_NBI)) assert.match(guia.ruta, /^\/guias\/[a-z0-9-]+$/);
    const p = puenteDe('que-es-rag');
    assert.ok(p);
    assert.equal(p.href, 'https://ianexora.com/guias/que-es-un-agente-de-ia?utm_source=blog&utm_medium=puente&utm_campaign=que-es-rag');
  });

  test('el artículo, el glosario y los recursos lo pintan', () => {
    for (const f of ['src/app/blog/[slug]/page.tsx', 'src/app/glosario/page.tsx', 'src/app/glosario/[id]/page.tsx', 'src/app/herramientas/page.tsx']) {
      assert.match(source(f), /<PuenteNbi /, `${f} no pinta el puente.`);
    }
  });
});
