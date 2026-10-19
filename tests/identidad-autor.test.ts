import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PERSONA, siteConfig } from '@/config/site';
import { articleJsonLd, personJsonLd } from '@/lib/jsonld';

/**
 * Kata Ivanovych y Katalin Savyuk: la relación se declara, no se unifica
 * (decisión D5 del plan SEO de ianexora.com, la mitad del blog).
 *
 * ianexora.com ya dice «En el blog firmo como Kata Ivanovych». Aquí va la
 * recíproca: una línea visible en el pie y en «El viaje», el mismo dato en el
 * nodo `Person` y tres enlaces desde artículos que tocan temas de la web.
 * Todo sale de `siteConfig.author` para que lo que declara el schema y lo que
 * se ve no puedan separarse.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(`${root}${file}`, 'utf8');

describe('identidad del autor', () => {
  test('el nodo Person declara el nombre alternativo y su página en ianexora.com', () => {
    // 17-oct-2026 (Katalin): una sola entidad en los dos sitios. El nombre del
    // nodo es Katalin Savyuk, la firma Kata Ivanovych va como alternateName y
    // la página de ianexora.com es su `url` (antes, un `sameAs` más).
    const person = personJsonLd() as Record<string, unknown>;
    assert.equal(person.name, 'Katalin Savyuk');
    assert.equal(person.alternateName, 'Kata Ivanovych');
    assert.equal(person.url, 'https://ianexora.com/sobre-katalin-savyuk');
    // Los perfiles de siempre siguen en sameAs: la página nueva se suma, no sustituye.
    for (const link of siteConfig.social) assert.ok((person.sameAs as string[]).includes(link.href));
  });

  test('cada artículo escrito a mano apunta a ese mismo nodo como autor, y la página lo lleva', () => {
    // Hasta el 13-oct-2026 el autor de un artículo era un `Person` suelto, solo
    // con el nombre: el nodo con `sameAs` existía únicamente en la home, y nada
    // unía el artículo con la persona que lo firma.
    const person = personJsonLd() as Record<string, unknown>;
    const articulo = articleJsonLd({
      title: 't', description: 'd', date: '2026-10-13', formato: 'nota', tags: [], permalink: '/blog/x', metadata: {},
    }) as Record<string, Record<string, unknown>>;
    assert.equal(articulo.author['@id'], person['@id']);
    assert.equal(articulo.author.name, PERSONA.name);
    assert.equal(articulo.publisher['@id'], person['@id']);
    assert.match(source('src/app/blog/[slug]/page.tsx'), /articleJsonLd\(post\),\s*personJsonLd\(\),/);
  });

  test('lo que declara el schema se ve: el pie y «El viaje» pintan la misma línea y el mismo enlace', () => {
    for (const file of ['src/components/layout/footer.tsx', 'src/app/sobre-mi/page.tsx']) {
      assert.match(source(file), /siteConfig\.author\.byline/, `${file} ya no pinta la línea de identidad.`);
      assert.match(source(file), /siteConfig\.author\.profileUrl/, `${file} ya no enlaza a la página de ianexora.com.`);
    }
    assert.ok(siteConfig.author.byline.includes(siteConfig.author.alternateName));
  });

  test('la línea usa solo el vocabulario aprobado: «construye NBI», sin forma jurídica, cargo ni plural de empresa', () => {
    // Reglas de voz: ni forma jurídica, ni cargo, ni plural de empresa.
    assert.doesNotMatch(siteConfig.author.byline, /S\.L\.|\bCIF\b|sociedad|\bsomos\b|mi equipo|la empresa|fundador|consultor/i);
    assert.match(siteConfig.author.byline, /construye NBI \(Nexora Business Intelligence\)/);
  });

  test('los artículos que tocan temas de la web enlazan a una página de ianexora.com que existe, con su utm', () => {
    // La fecha es la de la última edición de cada artículo: el 7-oct-2026 dos
    // de ellos recibieron sus piezas interactivas (fase 4).
    const enlaces: [string, string, string][] = [
      ['content/posts/que-proceso-automatizar-primero.mdx', '/calculadora-coste-tareas-repetitivas', '2026-10-11'],
      ['content/posts/que-proceso-automatizar-primero.mdx', '/servicios/diagnostico-de-procesos', '2026-10-11'],
      // 13-oct-2026: precios de la calculadora releídos, y las dos proporciones del texto con ellos.
      // 15-oct-2026: releídos otra vez, sin cambios; la fecha va con la de la tabla.
      ['content/posts/cuanto-cuesta-la-ia.mdx', '/precios', '2026-10-15'],
      ['content/posts/antes-del-tms-tu-inbox.mdx', '/agentes/correo', '2026-10-11'],
      // 11-oct-2026: el artículo del TMS, reencuadrado (A7 del diagnóstico AEO), apunta a las guías y al servicio vigentes.
      ['content/posts/antes-del-tms-tu-inbox.mdx', '/guias/errores-al-teclear-pedidos', '2026-10-11'],
      ['content/posts/antes-del-tms-tu-inbox.mdx', '/guias/ocr-o-ia-para-leer-pedidos', '2026-10-11'],
      ['content/posts/antes-del-tms-tu-inbox.mdx', '/calculadora-coste-tareas-repetitivas', '2026-10-11'],
      ['content/posts/antes-del-tms-tu-inbox.mdx', '/servicios/diagnostico-de-procesos', '2026-10-11'],
      ['content/posts/que-es-un-agente.mdx', '/guias/que-es-un-agente-de-ia', '2026-10-11'],
      ['content/posts/medir-un-sistema.mdx', '/guias/como-medir-si-una-automatizacion-funciona', '2026-10-11'],
    ];
    for (const [file, ruta, fecha] of enlaces) {
      const slug = file.split('/').pop()!.replace('.mdx', '');
      assert.ok(
        source(file).includes(`https://ianexora.com${ruta}?utm_source=blog&utm_medium=article&utm_campaign=${slug}`),
        `${file} ya no enlaza a ${ruta}.`,
      );
      assert.match(source(file), new RegExp(`^updated: ${fecha}$`, 'm'), `${file}: cambió el contenido y no la fecha de actualización.`);
    }
  });
});
