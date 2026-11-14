import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { tagHref } from '@/config/taxonomy';
import { SECTOR_KEYS, SECTORES, esSector, rutaDeSector, RUTA_SECTORES } from '@/config/sectores';
import { getPostsBySector, sectoresConContenido } from '@/lib/posts';
import sitemap from '@/app/sitemap';

describe('las páginas por sector', () => {
  test('solo existen los sectores que ya tienen un artículo editorial publicado', () => {
    const vivos = sectoresConContenido();
    assert.deepEqual(vivos, ['inmobiliarias', 'peluquerias', 'hosteleria']);
    for (const sector of SECTOR_KEYS) {
      assert.ok(getPostsBySector(sector).length > 0, `${sector} no debería estar en la lista si no tiene artículos`);
    }
    assert.equal(esSector('clinicas'), false);
  });

  test('los artículos de cada sector son los que ya llevan esa etiqueta', () => {
    assert.ok(
      getPostsBySector('inmobiliarias').some(
        (p) => p.slug === 'que-hace-y-que-no-hace-un-asistente-de-whatsapp-en-una-inmobiliaria',
      ),
    );
    assert.ok(getPostsBySector('peluquerias').some((p) => p.slug === 'recepcionista-ia-whatsapp-peluqueria'));
    const hostel = getPostsBySector('hosteleria').map((p) => p.slug);
    assert.ok(hostel.includes('como-hice-maitreai'));
    assert.ok(hostel.includes('maitreai-geo'));
    assert.ok(!getPostsBySector('inmobiliarias').some((p) => p.formato === 'radar'));
  });

  test('las etiquetas de sector van a la página del sector, no al tag noindex', () => {
    assert.equal(tagHref('inmobiliarias'), '/blog/sector/inmobiliarias');
    assert.equal(tagHref('peluqueria'), '/blog/sector/peluquerias');
    assert.equal(tagHref('hosteleria'), '/blog/sector/hosteleria');
    assert.equal(tagHref('restaurantes'), '/blog/sector/hosteleria');
    assert.equal(tagHref('roi'), '/blog/tag/roi');
  });

  test('el sitemap lista el índice y cada sector con contenido, y no una clínica vacía', () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    assert.ok(urls.includes(RUTA_SECTORES));
    for (const sector of sectoresConContenido()) {
      assert.ok(urls.includes(rutaDeSector(sector)), rutaDeSector(sector));
    }
    assert.equal(urls.includes('/blog/sector/clinicas'), false);
  });

  test('las descripciones salen del texto ya publicado, sin cifras nuevas', () => {
    assert.match(SECTORES.inmobiliarias.description, /está en pruebas/);
    assert.match(SECTORES.peluquerias.description, /recepcionista de IA/);
    assert.match(SECTORES.hosteleria.description, /MaitreAI/);
    assert.doesNotMatch(JSON.stringify(SECTORES), /\d[\d.,]*\s*%|\bclientes reales\b/i);
  });
});
