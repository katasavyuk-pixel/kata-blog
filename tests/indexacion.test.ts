import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sitemap from '@/app/sitemap';
import { allPosts, esAutomatico, esIndexable, getPostsByEstante, tienePaginaViva, zonasConContenido, type Post } from '@/lib/posts';
import { ESTANTE_KEYS, RUTA_POR_ESTANTE } from '@/config/taxonomy';
import { metadataDePost } from '@/lib/seo';
import { articleJsonLd } from '@/lib/jsonld';
import { PERSONA, ROBOTS_GOOGLE, siteConfig } from '@/config/site';
import { ETIQUETA_IA, etiquetaIa } from '@/config/noticias';
import { publicUrlFor } from '../scripts/seo/indexnow-urls.mjs';

/**
 * Qué entra en el índice de un buscador, y qué dice cada pieza de sí misma.
 *
 * El 13-oct-2026 Google conocía una sola URL del sitio y 26 de los 44 posts
 * eran piezas automáticas sin revisar, indexables y firmadas con el nombre del
 * autor. La regla desde entonces: lo escrito a mano se indexa; lo automático es
 * un servicio de lectura (`noindex, follow`, fuera del sitemap y de IndexNow)
 * hasta que una persona lo revisa, y dice que lo generó una IA en vez de
 * llevar una firma. Cada sitio donde esa regla podía desalinearse tiene aquí
 * su comprobación.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');

const automaticos = allPosts.filter(esAutomatico);
const escritos = allPosts.filter((post) => !esAutomatico(post));

describe('qué se indexa', () => {
  test('hay de los dos tipos, o este test no prueba nada', () => {
    assert.ok(automaticos.length > 0 && escritos.length > 0);
  });

  test('todo lo escrito a mano es indexable', () => {
    for (const post of escritos) assert.equal(esIndexable(post), true, post.slug);
  });

  test('una pieza automática solo es indexable si una persona la revisó', () => {
    assert.equal(esIndexable({ formato: 'radar', revisado: false }), false);
    assert.equal(esIndexable({ formato: 'radar', revisado: true }), true);
    assert.equal(esIndexable({ formato: 'nota', revisado: false }), true);
  });

  test('la página de una pieza automática pide «noindex, follow»; las demás no tocan robots', () => {
    for (const post of allPosts) {
      const meta = metadataDePost(post);
      if (esIndexable(post)) {
        assert.equal('robots' in meta, false, `${post.slug} es indexable y redefine robots.`);
      } else {
        assert.deepEqual(meta.robots, { index: false, follow: true }, post.slug);
      }
      assert.equal(meta.alternates?.canonical, post.permalink, post.slug);
    }
  });

  test('la página del artículo emite exactamente esa metadata', () => {
    assert.match(source('src/app/blog/[slug]/page.tsx'), /return post \? metadataDePost\(post\) : \{\};/);
  });

  test('el sitemap lista lo indexable y nada más', () => {
    const urls = new Set(sitemap().map((entry) => entry.url));
    for (const post of allPosts) {
      assert.equal(
        urls.has(`${siteConfig.url}${post.permalink}`),
        esIndexable(post),
        `${post.slug}: el sitemap y esIndexable no dicen lo mismo.`,
      );
    }
    assert.ok(urls.has(`${siteConfig.url}/noticias`), 'La portada de noticias sí se indexa: explica y lista.');
  });

  test('IndexNow anuncia lo mismo que el sitemap lista', () => {
    const dir = join(root, 'content/posts');
    const publicos = new Map(allPosts.map((post) => [post.slug, post]));
    for (const name of readdirSync(dir).filter((file) => file.endsWith('.mdx'))) {
      const slug = name.replace(/\.mdx$/, '');
      const anunciada = publicUrlFor(`content/posts/${name}`, readFileSync(join(dir, name), 'utf8'));
      const post = publicos.get(slug);
      const esperada = post && esIndexable(post) ? post.permalink : null;
      assert.equal(anunciada, esperada, `${name}: IndexNow y el sitio no coinciden.`);
    }
  });

  test('IndexNow lee el frontmatter de verdad', () => {
    const fm = (lines: string[]) => `---\n${lines.join('\n')}\n---\n\nTexto.\n`;
    assert.equal(publicUrlFor('content/posts/x.mdx', fm(['formato: nota', 'draft: true'])), null);
    assert.equal(publicUrlFor('content/posts/x.mdx', fm(['formato: nota', 'draft: false'])), '/blog/x');
    assert.equal(publicUrlFor('content/posts/noticias-2026-10-12.mdx', fm(['formato: radar'])), null);
    assert.equal(publicUrlFor('content/posts/noticias-2026-10-12.mdx', fm(['formato: radar', 'revisado: true'])), '/blog/noticias-2026-10-12');
    assert.equal(publicUrlFor('content/newsletters/2026-10-a.md', fm(['sent: false'])), null);
    assert.equal(publicUrlFor('content/newsletters/2026-10-a.md', fm(['sent: true'])), '/newsletter/2026-10-a');
    assert.equal(publicUrlFor('src/app/page.tsx', 'export default 1'), null);
  });

  test('la página de un estante existe solo mientras hay algo en él', () => {
    // /guias y /reflexiones sin piezas serían un listado vacío e indexable.
    const urls = new Set(sitemap().map((entry) => entry.url));
    for (const estante of ['guias', 'reflexiones'] as const) {
      const hayPiezas = getPostsByEstante(estante).length > 0;
      assert.equal(zonasConContenido().includes(estante), hayPiezas, estante);
      assert.equal(tienePaginaViva(estante), hayPiezas, estante);
      assert.equal(urls.has(`${siteConfig.url}${RUTA_POR_ESTANTE[estante]}`), hayPiezas, `${estante}: el sitemap y el contenido no dicen lo mismo.`);
    }
    // Vacío responde 404: el listado no se pinta sin piezas.
    assert.match(source('src/components/content/estante-pagina.tsx'), /if \(posts\.length === 0\) notFound\(\);/);
    // Un estante que solo es un filtro del archivo no tiene página que enlazar.
    for (const estante of ESTANTE_KEYS) {
      if (RUTA_POR_ESTANTE[estante] === '/blog') assert.equal(tienePaginaViva(estante), false, estante);
    }
    assert.equal(tienePaginaViva('sistemas'), true);
  });

  test('lo indexable pide a Google la vista previa grande, la que usa Discover', () => {
    assert.equal(ROBOTS_GOOGLE['max-image-preview'], 'large');
    assert.match(source('src/app/layout.tsx'), /robots:\s*\{\s*index:\s*true,\s*follow:\s*true,\s*googleBot:\s*ROBOTS_GOOGLE\s*\}/);
  });

  test('la home declara su propia canónica', () => {
    assert.match(source('src/app/page.tsx'), /alternates:\s*\{\s*\.\.\.feedAlternates,\s*canonical:\s*"\/"\s*\}/);
  });
});

describe('qué dice de sí misma una pieza automática', () => {
  test('el aviso distingue lo revisado de lo que no', () => {
    // 2026-10-17, decisión de Kata: etiqueta corta y discreta mientras nadie la
    // ha revisado, y ninguna cuando él la ha leído (excepción del art. 50.4).
    assert.equal(etiquetaIa({ revisado: false }), ETIQUETA_IA);
    assert.equal(etiquetaIa({ revisado: true }), null);
    assert.match(ETIQUETA_IA, /con IA/);
  });

  test('el mismo literal en los cinco sitios donde aparece una noticia', () => {
    const SUPERFICIES = [
      'src/app/blog/[slug]/page.tsx', // firma del artículo
      'src/app/noticias/page.tsx', // portada de noticias
      'src/components/portada/portada.tsx', // la noticia del día y los breves de la home
      'src/components/blog/fuentes-noticia.tsx', // caja de fuente
      'src/app/noticias/feed.xml/route.ts', // descripción del feed
    ];
    for (const file of SUPERFICIES) {
      assert.match(source(file), /\bETIQUETA_IA\b|\betiquetaIa\(/, `${file} ya no pinta el aviso de IA.`);
    }
  });

  test('no la firma una persona: ni en la cabecera ni al pie', () => {
    const pagina = source('src/app/blog/[slug]/page.tsx');
    // El nombre y el retrato solo se pintan en la rama de lo escrito a mano.
    assert.match(pagina, /\{automatico \? \([\s\S]*?FIRMA_AUTOMATICA[\s\S]*?\) : \([\s\S]*?siteConfig\.author\.name[\s\S]*?\)\}/);
    assert.match(
      source('src/components/blog/article-closing.tsx'),
      /esAutomatico\(post\) \? <OrigenAutomatico[^>]*\/> : <AuthorBio \/>/,
    );
  });

  test('tampoco en los datos estructurados ni en el feed', () => {
    const base = { title: 't', description: 'd', date: '2026-10-12', tags: [], permalink: '/blog/x', metadata: {} };
    const automatica = articleJsonLd({ ...base, formato: 'radar' }) as Record<string, unknown>;
    assert.equal('author' in automatica, false, 'Una pieza automática declara autor.');
    // 17-oct-2026: the publisher is the person both sites share (PERSONA), not a node of this domain.
    assert.equal((automatica.publisher as Record<string, unknown>)['@id'], PERSONA.id);
    assert.match(source('src/lib/feed.ts'), /esAutomatico\(post\) \? FIRMA_AUTOMATICA : siteConfig\.author\.name/);
  });

  test('lo publicado hoy sigue sin revisar, que es lo que dice el aviso', () => {
    // Si alguien marca una pieza como revisada, este recuento baja y el test
    // sigue pasando: lo que no puede haber es una revisada que no sea automática.
    for (const post of allPosts as Post[]) {
      if (post.revisado) assert.equal(esAutomatico(post), true, `${post.slug} no es automática y lleva «revisado».`);
    }
  });
});
