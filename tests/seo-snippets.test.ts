import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { allPosts, esIndexable } from '@/lib/posts';
import { DESCRIPCION_MAX, TITULO_MAX, metadataDePost, tituloEfectivo } from '@/lib/seo';
import { siteConfig } from '@/config/site';

/**
 * El título y la descripción que un buscador enseña de cada artículo.
 *
 * Un título de más de 60 caracteres y una descripción de más de 155 se cortan
 * en el resultado. El 13-oct-2026 once títulos (con el sufijo «· Kata
 * Ivanovych» que añade el layout) y trece descripciones pasaban de ahí.
 *
 * Arreglarlos era trabajo de contenido, artículo a artículo, así que no se
 * exigió de golpe: `PENDIENTES` era la deuda, con nombre. Se saldó el 14-oct
 * con un `seoTitle` y una descripción más corta en cada uno, sin tocar el H1.
 * Las listas quedan vacías y solo pueden seguir así: un artículo nuevo que se
 * pase rompe la build.
 */
const PENDIENTES_TITULO: string[] = [];

const PENDIENTES_DESCRIPCION: string[] = [];

const indexables = allPosts.filter(esIndexable);

function comprobar(
  nombre: string,
  pendientes: string[],
  max: number,
  medir: (post: (typeof indexables)[number]) => string,
) {
  describe(nombre, () => {
    test(`ningún artículo indexable pasa de ${max} caracteres, salvo la deuda con nombre`, () => {
      for (const post of indexables) {
        if (pendientes.includes(post.slug)) continue;
        const texto = medir(post);
        assert.ok(texto.length <= max, `${post.slug}: ${texto.length} caracteres — «${texto}»`);
      }
    });

    test('la deuda solo encoge: lo que ya cumple sale de la lista', () => {
      for (const slug of pendientes) {
        const post = indexables.find((candidate) => candidate.slug === slug);
        assert.ok(post, `${slug} está en la lista y ya no es un artículo indexable: quítalo.`);
        assert.ok(medir(post).length > max, `${slug} ya cumple: quítalo de la lista.`);
      }
      assert.equal(new Set(pendientes).size, pendientes.length, 'hay slugs repetidos en la lista');
    });
  });
}

comprobar('título en el resultado', PENDIENTES_TITULO, TITULO_MAX, tituloEfectivo);
comprobar('descripción en el resultado', PENDIENTES_DESCRIPCION, DESCRIPCION_MAX, (post) => post.description);

describe('seoTitle', () => {
  const post = indexables[0];

  test('sin seoTitle, el <title> es el H1 y el layout le añade el nombre del sitio', () => {
    const meta = metadataDePost({ ...post, seoTitle: undefined });
    assert.equal(meta.title, post.title);
    assert.equal(tituloEfectivo({ title: 'Qué es RAG', seoTitle: undefined }), `Qué es RAG · ${siteConfig.name}`);
  });

  test('con seoTitle, sustituye al <title> entero y deja el H1 y og:title como están', () => {
    const seoTitle = 'Qué es RAG y cuándo lo necesita un negocio pequeño';
    const meta = metadataDePost({ ...post, seoTitle });
    assert.deepEqual(meta.title, { absolute: seoTitle });
    assert.equal(meta.openGraph?.title, post.title);
    assert.equal(tituloEfectivo({ title: post.title, seoTitle }), seoTitle);
  });
});
