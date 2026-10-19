import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PERSONA, siteConfig } from '@/config/site';
import { articleJsonLd, coleccionJsonLd, fechaConZona, personJsonLd } from '@/lib/jsonld';

/**
 * Lo que el blog declara de sí mismo a una máquina (auditoría del 17-oct-2026).
 *
 * Una sola persona en los dos sitios, con el `@id` de ianexora.com; cada
 * artículo con imagen, fechas con zona y su blog; y cada página indexable con
 * sus datos estructurados (eran 16 sin ninguno).
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');
const base = { title: 't', description: 'd', date: '2026-06-25T00:00:00.000Z', tags: [], permalink: '/blog/x', metadata: {} };

describe('la persona', () => {
  const person = personJsonLd() as Record<string, unknown>;

  test('es la de ianexora.com: mismo @id, nombre, cargo y empresa', () => {
    assert.equal(person['@id'], 'https://ianexora.com/sobre-katalin-savyuk#person');
    assert.equal(person.name, 'Katalin Savyuk');
    assert.equal(person.alternateName, 'Kata Ivanovych');
    assert.equal(person.jobTitle, 'Fundador de NBI');
    assert.deepEqual(person.worksFor, { '@id': 'https://ianexora.com/#organization' });
  });

  test('sameAs: los perfiles del pie y el blog, cada uno con una sola forma', () => {
    const sameAs = person.sameAs as string[];
    assert.deepEqual(sameAs, [...siteConfig.social.map((l) => l.href), 'https://kata.ianexora.com']);
    for (const url of sameAs) assert.ok(!sameAs.includes(url.endsWith('/') ? url.slice(0, -1) : `${url}/`), `${url} sale con y sin barra.`);
    assert.ok(sameAs.includes('https://www.linkedin.com/in/katalin-savyuk-b024b7408'), 'El LinkedIn va sin barra final, como en ianexora.com.');
  });

  test('ninguna página declara otra persona', () => {
    assert.doesNotMatch(source('src/lib/jsonld.ts'), /\/#person`/);
    assert.equal(PERSONA.id, person['@id']);
  });
});

describe('los artículos', () => {
  test('BlogPosting, salvo lo técnico, que sigue siendo TechArticle', () => {
    assert.equal(articleJsonLd({ ...base, formato: 'nota' })['@type'], 'BlogPosting');
    assert.equal(articleJsonLd({ ...base, formato: 'leccion' })['@type'], 'TechArticle');
  });

  test('llevan imagen: la portada, absoluta, o la tarjeta por defecto', () => {
    const conPortada = articleJsonLd({ ...base, formato: 'nota', cover: { src: '/static/x.webp', width: 1600, height: 900 } });
    assert.equal((conPortada.image as Record<string, unknown>).url, `${siteConfig.url}/static/x.webp`);
    const sin = articleJsonLd({ ...base, formato: 'nota' });
    assert.equal((sin.image as Record<string, unknown>).url, `${siteConfig.url}/opengraph-image`);
  });

  test('las fechas llevan la zona de Madrid, no la medianoche UTC', () => {
    const a = articleJsonLd({ ...base, formato: 'nota', updated: '2026-01-10T00:00:00.000Z' });
    assert.equal(a.datePublished, '2026-06-25T00:00:00+02:00');
    assert.equal(a.dateModified, '2026-01-10T00:00:00+01:00');
    assert.equal(fechaConZona('2026-10-12T21:30:00.000Z'), '2026-10-12T23:30:00+02:00');
  });

  test('un post es parte del blog; una edición de la newsletter, no', () => {
    assert.equal((articleJsonLd({ ...base, formato: 'nota' }).isPartOf as Record<string, unknown>)['@type'], 'Blog');
    assert.equal('isPartOf' in articleJsonLd({ ...base, formato: 'nota', permalink: '/newsletter/x' }), false);
  });
});

describe('los listados y las páginas sueltas', () => {
  test('una colección enumera lo que enseña, con sus migas', () => {
    const [pagina, migas] = coleccionJsonLd({ path: '/glosario', name: 'Glosario', description: 'd', items: [{ name: 'Token', url: '/glosario/token' }] });
    assert.equal(pagina['@type'], 'CollectionPage');
    const lista = pagina.mainEntity as { itemListElement: { url: string }[] };
    assert.equal(lista.itemListElement[0].url, `${siteConfig.url}/glosario/token`);
    assert.equal(migas['@type'], 'BreadcrumbList');
  });

  test('cada página indexable sin artículo emite sus datos estructurados', () => {
    const paginas = [
      'src/app/sistemas/page.tsx', 'src/app/blog/page.tsx', 'src/app/noticias/page.tsx', 'src/app/empieza-aqui/page.tsx',
      'src/app/glosario/page.tsx', 'src/app/marketplace/page.tsx', 'src/app/bitacora/page.tsx', 'src/app/videos/page.tsx',
      'src/app/herramientas/page.tsx', 'src/app/trabaja-con-nbi/page.tsx', 'src/app/privacidad/page.tsx',
      'src/app/cookies/page.tsx', 'src/app/herramientas/no-me-da-la-vida/page.tsx',
      'src/app/herramientas/ficha-para-tu-ia/page.tsx', 'src/app/sobre-mi/page.tsx',
      // /guias y /reflexiones, a través del componente que las pinta.
      'src/components/content/estante-pagina.tsx',
    ];
    for (const p of paginas) assert.match(source(p), /coleccionJsonLd\(|paginaJsonLd\(|perfilJsonLd\(/, `${p} no emite JSON-LD.`);
  });
});
