import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getPostsByEstante } from '@/lib/posts';
import { FAQ_MIN, enlacesExternos, erroresDeGuia } from '@/lib/guias';

/**
 * Una guía se distingue de una nota en cuatro cosas que se pueden comprobar.
 *
 * El formato `guia` existe para lo que la gente busca (cuánto cuesta, cómo se
 * instala, cuál elegir). Si una pieza se etiqueta así sin el título de
 * búsqueda, sin la pregunta en un apartado, sin sus preguntas frecuentes o sin
 * una fuente, es una nota con otro nombre, y la página /guias promete otra
 * cosa. `erroresDeGuia` es la regla; este test la aplica a todo lo publicado.
 */

const frase = 'Texto de relleno suficiente para que la respuesta se sostenga sola al leerla.';
const faq = (n: number) => Array.from({ length: n }, (_, i) => ({ q: `¿Pregunta ${i + 1}?`, a: frase }));

const guia = (over: Partial<Parameters<typeof erroresDeGuia>[0]> = {}) => ({
  slug: 'guia-de-prueba',
  seoTitle: 'Cuánto cuesta un agente de IA: la factura real',
  toc: [
    { title: 'Lo que pagué el primer mes', url: '#a', items: [] },
    { title: '¿Cuánto cuesta un agente de IA al mes?', url: '#b', items: [] },
  ],
  faq: faq(FAQ_MIN),
  content: 'a({ href: "https://www.anthropic.com/pricing", children: "precios" })',
  ...over,
});

describe('qué hace falta para ser una guía', () => {
  test('una guía completa no da errores', () => {
    assert.deepEqual(erroresDeGuia(guia()), []);
  });

  test('sin título de búsqueda no lo es', () => {
    assert.match(erroresDeGuia(guia({ seoTitle: undefined })).join('\n'), /seoTitle/);
    assert.match(erroresDeGuia(guia({ seoTitle: '   ' })).join('\n'), /seoTitle/);
  });

  test('sin un apartado escrito como pregunta no lo es', () => {
    const errores = erroresDeGuia(guia({ toc: [{ title: 'Costes mensuales', url: '#a', items: [] }] }));
    assert.match(errores.join('\n'), /pregunta que responde/);
    // Un interrogante suelto al final no convierte un rótulo en una pregunta.
    assert.equal(erroresDeGuia(guia({ toc: [{ title: 'Costes?', url: '#a', items: [] }] })).length, 1);
  });

  test(`con menos de ${FAQ_MIN} preguntas frecuentes no lo es`, () => {
    assert.match(erroresDeGuia(guia({ faq: faq(FAQ_MIN - 1) })).join('\n'), /preguntas frecuentes/);
  });

  test('sin una fuente externa no lo es, y los dominios propios no cuentan como fuente', () => {
    const propios = 'a({ href: "https://ianexora.com/precios" }) a({ href: "https://kata.ianexora.com/blog/x" })';
    assert.deepEqual(enlacesExternos({ content: propios }), []);
    assert.match(erroresDeGuia(guia({ content: propios })).join('\n'), /fuente externa/);
    assert.deepEqual(enlacesExternos({ content: 'a({ href: "https://www.boe.es/buscar/act.php" })' }), [
      'https://www.boe.es/buscar/act.php',
    ]);
  });

  test('los cuatro fallos se informan a la vez', () => {
    assert.equal(erroresDeGuia(guia({ seoTitle: undefined, toc: [], faq: [], content: '' })).length, 4);
  });
});

describe('lo publicado', () => {
  test('toda guía publicada cumple las cuatro', () => {
    for (const post of getPostsByEstante('guias')) {
      assert.deepEqual(erroresDeGuia(post), [], `${post.slug} está etiquetada como guía y no lo es todavía.`);
    }
  });
});
