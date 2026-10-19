import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { LIBRARY_ITEMS } from '@/config/library';
import { allPosts, esAutomatico, getPost } from '@/lib/posts';
import { apareceEn, buildGrafo, grafo, relacionesDe } from '@/lib/relaciones';
import { enlacesExternos } from '@/lib/guias';
import { parseNovedades } from '@/lib/novedades';

/**
 * Las relaciones entre piezas: se declaran en un sitio y se demuestran.
 *
 * Una reflexión dice «a raíz de» qué noticia nació y «se resuelve con» qué
 * sistema. El enlace inverso —qué se escribió a raíz de una noticia, dónde
 * aparece un sistema— se deriva, así que no puede faltar ni contradecirse.
 * `buildGrafo` es la regla; aquí se prueba con una mutación por cada cosa que
 * puede romperse y con lo publicado.
 */
const root = fileURLToPath(new URL('..', import.meta.url));

type Nodo = Parameters<typeof buildGrafo>[0][number];
const nodo = (slug: string, over: Partial<Nodo> = {}): Nodo => ({
  slug,
  formato: 'reflexion',
  a_raiz_de: [],
  se_resuelve_con: [],
  ...over,
});
const ITEMS = [{ id: 'calculadora' }, { id: 'verificador' }];

describe('grafo de relaciones', () => {
  const noticia = nodo('noticias-2026-09-23', { formato: 'radar' });
  const ensayo = nodo('ensayo', { a_raiz_de: ['noticias-2026-09-23'], se_resuelve_con: ['calculadora'] });
  const otro = nodo('otro-ensayo', { a_raiz_de: ['noticias-2026-09-23'] });

  test('las dos direcciones salen de una sola declaración', () => {
    const g = buildGrafo([ensayo, otro, noticia], ITEMS);
    assert.deepEqual(g.aRaizDe.get('ensayo'), [noticia]);
    assert.deepEqual(g.seResuelveCon.get('ensayo'), [ITEMS[0]]);
    // La inversa conserva el orden de las piezas: aquí, el de publicación.
    assert.deepEqual(g.dioLugarA.get('noticias-2026-09-23'), [ensayo, otro]);
    assert.deepEqual(g.apareceEn.get('calculadora'), [ensayo]);
    assert.equal(g.apareceEn.has('verificador'), false);
  });

  const ROTAS: [string, Nodo[], RegExp][] = [
    ['un slug que no existe o no está publicado', [nodo('a', { a_raiz_de: ['no-existe'] })], /a_raiz_de apunta a «no-existe»/],
    ['un sistema que no está en el catálogo', [nodo('a', { se_resuelve_con: ['inventado'] })], /se_resuelve_con apunta a «inventado»/],
    ['una pieza que se cita a sí misma', [nodo('a', { a_raiz_de: ['a'] })], /se cita a sí mismo/],
    ['la misma referencia dos veces', [nodo('a', { a_raiz_de: ['b', 'b'] }), nodo('b')], /repite una referencia/],
    [
      'una pieza automática que declara relaciones',
      [nodo('noticias-2026-10-12', { formato: 'radar', se_resuelve_con: ['calculadora'] })],
      /es una pieza automática y declara relaciones/,
    ],
  ];
  for (const [nombre, posts, mensaje] of ROTAS) {
    test(`${nombre} rompe la build`, () => {
      assert.throws(() => buildGrafo(posts, ITEMS), mensaje);
    });
  }

  test('todos los fallos se informan juntos', () => {
    assert.throws(
      () => buildGrafo([nodo('a', { a_raiz_de: ['x'], se_resuelve_con: ['y'] })], ITEMS),
      (error: Error) => /«x»/.test(error.message) && /«y»/.test(error.message),
    );
  });
});

describe('lo publicado', () => {
  test('el grafo se construye con los posts y el catálogo reales', () => {
    assert.doesNotThrow(() => buildGrafo(allPosts, LIBRARY_ITEMS));
  });

  test('cada relación declarada tiene su inversa', () => {
    for (const post of allPosts) {
      const { aRaizDe, seResuelveCon } = relacionesDe(post);
      assert.equal(aRaizDe.length, post.a_raiz_de.length, post.slug);
      assert.equal(seResuelveCon.length, post.se_resuelve_con.length, post.slug);
      for (const citado of aRaizDe) {
        assert.ok(relacionesDe(citado).dioLugarA.includes(post), `${citado.slug} no enlaza de vuelta a ${post.slug}`);
      }
      for (const item of seResuelveCon) {
        assert.ok(apareceEn(item.id).includes(post), `${item.id} no enlaza de vuelta a ${post.slug}`);
      }
    }
    assert.ok(grafo.aRaizDe.size > 0, 'no hay ninguna relación publicada: este test no prueba nada');
  });

  test('«a raíz de» una noticia se demuestra: la pieza enlaza una fuente de esa noticia', () => {
    // Decir que un texto nació de una noticia es una afirmación sobre el propio
    // sitio. Lo que la sostiene es que los dos citan lo mismo.
    for (const post of allPosts) {
      const propias = new Set(enlacesExternos(post));
      for (const citado of relacionesDe(post).aRaizDe.filter(esAutomatico)) {
        const fuentes = citado.protagonista
          ? [citado.fuente_url, ...citado.fuentes_apoyo]
          : parseNovedades(readFileSync(join(root, 'content/posts', `${citado.slug}.mdx`), 'utf8')).map((item) => item.url);
        assert.ok(
          fuentes.some((url) => url && propias.has(url)),
          `${post.slug} dice nacer de ${citado.slug} y no enlaza ninguna de sus fuentes.`,
        );
      }
    }
  });

  test('la reflexión del 23 de septiembre nace de la edición de ese día, y la edición la enlaza', () => {
    const ensayo = getPost('cuando-la-ia-se-abarata-el-coste-cambia-de-sitio');
    const edicion = getPost('noticias-2026-09-23');
    assert.ok(ensayo && edicion);
    assert.deepEqual(relacionesDe(ensayo).aRaizDe, [edicion]);
    assert.deepEqual(relacionesDe(edicion).dioLugarA, [ensayo]);
  });
});

describe('la página pinta lo que el grafo dice', () => {
  test('los tres bloques salen de relacionesDe y no pintan nada sin relaciones', () => {
    const pagina = readFileSync(join(root, 'src/app/blog/[slug]/page.tsx'), 'utf8');
    assert.match(pagina, /const relaciones = relacionesDe\(post\);/);
    assert.match(pagina, /<ARaizDe posts=\{relaciones\.aRaizDe\} \/>/);
    assert.match(pagina, /<SeResuelveCon items=\{relaciones\.seResuelveCon\} \/>/);
    assert.match(pagina, /<DioLugarA posts=\{relaciones\.dioLugarA\} \/>/);
    const bloques = readFileSync(join(root, 'src/components/blog/relaciones.tsx'), 'utf8');
    assert.equal((bloques.match(/\.length === 0\) return null;/g) ?? []).length, 3);
  });
});
