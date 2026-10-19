import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { allPosts } from '@/lib/posts';
import { metadataDePost } from '@/lib/seo';

/**
 * La tarjeta de un artículo con portada dice cuánto mide (og:image:width/height):
 * Discover y los previsualizadores de enlaces no tienen que descargar la imagen
 * para saber si es grande (17-oct-2026).
 */
describe('la imagen de la tarjeta de un artículo', () => {
  test('lleva ancho y alto de la portada', () => {
    const conPortada = allPosts.filter((post) => post.cover);
    assert.ok(conPortada.length > 0);
    for (const post of conPortada) {
      const images = (metadataDePost(post).openGraph as { images?: { url: string; width?: number; height?: number }[] }).images;
      assert.equal(images?.[0]?.width, post.cover!.width, post.slug);
      assert.equal(images?.[0]?.height, post.cover!.height, post.slug);
      assert.ok((images?.[0]?.width ?? 0) >= 1200, `${post.slug}: portada de menos de 1200 px, Discover no la usa en grande.`);
    }
  });
});
