import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { htmlToText, renderTemplate, TemplateError } from '@/lib/email-template';
import { newsletters, sequenceEmails } from '#site/content';

/**
 * Los enlaces de la secuencia de bienvenida, comprobados en el HTML compilado.
 *
 * Existe por un fallo concreto: `s.markdown()` de Velite percent-codifica las
 * llaves cuando el placeholder va en el destino de un enlace, así que
 * `[Empezar]({{url_sitio}}/empieza-aqui)` compila a
 * `href="%7B%7Burl_sitio%7D%7D/empieza-aqui"`. Ni la sustitución ni el guard de
 * sobrantes casaban con esa forma, de modo que el email salía impecable con
 * todos sus botones muertos. Estuvo así del 2026-07-29 al 2026-08-21.
 *
 * Por eso la comprobación es sobre el HTML de Velite y no sobre el markdown: el
 * markdown siempre tuvo bien los enlaces. Lo que estaba mal era lo que salía del
 * compilador, que es lo único que ve el suscriptor.
 */

const COMPILADO = join(import.meta.dirname, '..', '.velite', 'sequenceEmails.json');

const SITIO = 'https://kata.ianexora.com';

/** Las mismas que pasa `renderStep` en src/lib/welcome-sequence.tsx. */
const VARS = {
  url_sitio: SITIO,
  nombre_sitio: 'Kata Ivanovych',
  apertura_personalizada: '',
  bloque_descarga: '',
  bloque_regalo: '',
};

interface PasoCompilado {
  key: string;
  sequence: string;
  draft: boolean;
  html: string;
}

function leerPasos(): PasoCompilado[] {
  if (!existsSync(COMPILADO)) {
    throw new Error(
      `Falta ${COMPILADO}. Este test lee la salida de Velite, no el markdown: ` +
        `corre \`npm run build:content\` antes de \`npm test\`.`,
    );
  }
  const todos = JSON.parse(readFileSync(COMPILADO, 'utf8')) as PasoCompilado[];
  return todos.filter((p) => p.sequence === 'bienvenida' && !p.draft);
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!);
}

describe('enlaces de la secuencia de bienvenida', () => {
  const pasos = leerPasos();

  test('hay pasos que comprobar', () => {
    assert.ok(pasos.length > 0, 'sin pasos compilados este test no prueba nada');
  });

  for (const paso of pasos) {
    test(`${paso.key}: ningún enlace queda relativo ni codificado`, () => {
      const html = renderTemplate(paso.html, VARS);

      assert.ok(
        !html.includes('%7B%7B') && !html.includes('%7D%7D'),
        `${paso.key} conserva llaves percent-codificadas tras renderizar`,
      );
      assert.ok(!html.includes('{{'), `${paso.key} conserva un placeholder literal`);

      for (const href of hrefs(html)) {
        assert.ok(
          href.startsWith('https://') || href.startsWith('http://') || href.startsWith('mailto:'),
          `${paso.key}: href relativo "${href}". En un email no hay página desde la que resolverlo.`,
        );
      }
    });
  }

  test('los pasos con enlaces apuntan al dominio real', () => {
    const todos = pasos.flatMap((p) => hrefs(renderTemplate(p.html, VARS)));
    const delSitio = todos.filter((h) => h.startsWith(SITIO));
    assert.ok(
      delSitio.length >= 3,
      `solo ${delSitio.length} enlaces a ${SITIO}: la secuencia dejó de llevar a ninguna parte`,
    );
  });
});

describe('renderTemplate', () => {
  test('sustituye un placeholder percent-codificado dentro de un href', () => {
    const html = '<p><a href="%7B%7Burl_sitio%7D%7D/empieza-aqui">Empezar</a></p>';
    assert.equal(
      renderTemplate(html, { url_sitio: SITIO }),
      `<p><a href="${SITIO}/empieza-aqui">Empezar</a></p>`,
    );
  });

  test('lanza ante un nombre desconocido, también codificado', () => {
    assert.throws(
      () => renderTemplate('<a href="%7B%7Burl_sitiO%7D%7D/x">x</a>', { url_sitio: SITIO }),
      TemplateError,
      'un typo dentro de un enlace salía sin avisar: es el fallo que se corrigió',
    );
  });

  test('lanza ante un placeholder literal desconocido', () => {
    assert.throws(() => renderTemplate('<p>{{desglse}}</p>', { desglose: 'x' }), TemplateError);
  });

  test('un valor con $& no se corrompe', () => {
    // `$&` es especial en una cadena de reemplazo: sin replacer se convertiría
    // en el propio texto encontrado. Los valores llevan precios ($0.05), así
    // que esto es una mina, no una hipótesis.
    assert.equal(renderTemplate('<p>{{v}}</p>', { v: 'a$&b' }), 'a$&b');
  });
});

/**
 * La parte de texto plano, comprobada también sobre lo que sale de Velite.
 *
 * Velite escribe el `&` de la consulta de un enlace como `&#x26;`. `htmlToText`
 * solo deshacía `&amp;`, así que cada enlace con `utm` salía en texto plano
 * como `…?utm_source=newsletter&#x26;utm_medium=email…`: la página abría, la
 * dirección se veía rota y la campaña se perdía. Se vio el 2026-10-13, antes
 * del primer envío, al componer la página del mes con ese mismo HTML.
 */
describe('htmlToText', () => {
  test('un enlace con consulta llega entero, como lo escribe el compilador', () => {
    const html = '<p><a href="https://example.com/x?a=1&#x26;b=2&#38;c=3&amp;d=4">Leer</a></p>';
    assert.equal(htmlToText(html), 'Leer (https://example.com/x?a=1&b=2&c=3&d=4)\n');
  });

  test('cada entidad se deshace una sola vez', () => {
    assert.equal(htmlToText('<p>&amp;lt; &amp;#x26; &lt;b&gt; &quot;x&quot; &#39;y&#39; &apos;z&apos; a&nbsp;b &#xE9; &#241;</p>'), '&lt; &#x26; <b> "x" \'y\' \'z\' a b é ñ\n');
    // Not an entity: left as typed.
    assert.equal(htmlToText('<p>Q&A &copia; &#0; &#x110000;</p>'), 'Q&A &copia; &#0; &#x110000;\n');
  });

  test('ningún correo publicado deja una entidad sin deshacer en su texto plano', () => {
    const correos = [...newsletters, ...sequenceEmails];
    assert.ok(correos.length > 0, 'no hay correos compilados: ¿falta `npm run build:content`?');
    let conConsulta = 0;
    for (const correo of correos) {
      const texto = htmlToText(correo.html);
      const id = 'issue' in correo ? correo.issue : correo.key;
      assert.doesNotMatch(texto, /&(?:#x?[0-9a-f]+|amp|quot|lt|gt|nbsp|apos);/i, `${id} lleva una entidad HTML en su texto plano.`);
      if (/&#x26;/.test(correo.html)) conConsulta += 1;
    }
    // The case this exists for has to be in the corpus, or the test proves nothing.
    assert.ok(conConsulta > 0, 'ningún correo lleva ya un enlace con consulta: este test ha dejado de probar el caso.');
  });
});
