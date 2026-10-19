import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_SOURCE_WORDS,
  assessSourceText,
  countWords,
  extractArticleText,
} from '../scripts/radar/source-text.mjs';
import { pickLead, rankLeads, relevanceScore } from '../scripts/radar/lead-selection.mjs';

/**
 * Extracción e insuficiencia del texto fuente, y elección del protagonista.
 *
 * Sin estas dos piezas el artículo largo se escribiría a partir de un resumen
 * RSS de dos frases. No dependen de la red: se alimentan con HTML a mano.
 */

const sentence = (n: number) =>
  `Esta es la frase número ${n} de un párrafo con suficientes palabras para contar como prosa real.`;
const paragraph = (seed: number, sentences = 5) =>
  `<p>${Array.from({ length: sentences }, (_, i) => sentence(seed * 10 + i)).join(' ')}</p>`;

const longArticle = (paragraphs = 6) =>
  `<html><body><nav><p>Inicio Noticias Contacto Suscríbete ahora mismo a todo</p></nav><article>${Array.from(
    { length: paragraphs },
    (_, i) => paragraph(i),
  ).join('')}</article><footer><p>Aviso legal y cookies de la página web del medio fuente</p></footer></body></html>`;

describe('extractArticleText', () => {
  test('toma el cuerpo del <article> y descarta navegación y pie', () => {
    const out = extractArticleText(longArticle());
    assert.ok(out.words >= MIN_SOURCE_WORDS, `${out.words} palabras`);
    assert.equal(out.paragraphs, 6);
    assert.doesNotMatch(out.text, /Aviso legal|Suscríbete/);
  });

  test('ignora scripts, estilos y párrafos de menos de 8 palabras', () => {
    const out = extractArticleText(
      `<article><script>var x = "uno dos tres cuatro cinco seis siete ocho nueve diez";</script><p>Muy corto aquí.</p>${paragraph(1)}</article>`,
    );
    assert.equal(out.paragraphs, 1);
    assert.doesNotMatch(out.text, /var x|Muy corto/);
  });

  test('decodifica entidades HTML', () => {
    const out = extractArticleText(
      `<article><p>Una empresa &amp; su socio dijeron que el modelo &quot;funciona&quot; en producción desde hace meses.</p></article>`,
    );
    assert.match(out.text, /empresa & su socio/);
    assert.match(out.text, /"funciona"/);
  });

  test('HTML vacío o nulo no lanza', () => {
    assert.equal(extractArticleText('').words, 0);
    assert.equal(extractArticleText(undefined).words, 0);
  });
});

describe('assessSourceText: cuándo NO hay texto suficiente', () => {
  test('texto completo y largo es suficiente', () => {
    assert.deepEqual(assessSourceText(extractArticleText(longArticle())), { sufficient: true, reason: 'ok' });
  });

  test('un resumen RSS corto no basta', () => {
    const verdict = assessSourceText(extractArticleText(`<article>${paragraph(1, 2)}</article>`));
    assert.equal(verdict.sufficient, false);
    assert.equal(verdict.reason, 'too-short');
  });

  test('sin texto', () => {
    assert.deepEqual(assessSourceText(extractArticleText('<div></div>')), { sufficient: false, reason: 'no-text' });
    assert.equal(assessSourceText(null).sufficient, false);
  });

  test('un muro de pago con el principio de la nota no basta', () => {
    const html = `<article>${paragraph(1, 8)}<p>To continue reading, subscribe to continue and get full access to every story.</p></article>`;
    const verdict = assessSourceText(extractArticleText(html));
    assert.equal(verdict.sufficient, false);
    assert.equal(verdict.reason, 'paywall');
  });

  test('largo pero en un solo bloque tampoco', () => {
    const wall = `<article><p>${Array.from({ length: 60 }, (_, i) => sentence(i)).join(' ')}</p></article>`;
    const extracted = extractArticleText(wall);
    assert.ok(countWords(extracted.text) >= MIN_SOURCE_WORDS);
    assert.equal(assessSourceText(extracted).reason, 'too-few-paragraphs');
  });
});

describe('elección del protagonista', () => {
  const ok = { sufficient: true, reason: 'ok' };
  const item = (over: Record<string, unknown>) => ({
    title: 'Algo',
    summary: '',
    url: `https://ejemplo.test/${Math.random()}`,
    axis: 'geopolitica',
    publishedAt: '2026-10-09T05:00:00.000Z',
    textStatus: ok,
    ...over,
  });

  test('la relevancia manda sobre la actualidad', () => {
    const relevante = item({
      title: 'Company cuts jobs as AI agents take over support work',
      axis: 'ia',
      publishedAt: '2026-10-07T05:00:00.000Z',
    });
    const reciente = item({ title: 'Election results announced', publishedAt: '2026-10-09T05:30:00.000Z' });
    const ranked = rankLeads([reciente, relevante]);
    assert.equal(ranked[0], relevante);
    assert.ok(relevanceScore(relevante) > relevanceScore(reciente));
  });

  test('el eje no suma ni resta: una de geopolítica compite como cualquiera', () => {
    // Hasta el 14-oct-2026 todos los ejes sumaban un punto menos geopolítica.
    const titular = 'New export controls hit AI chips for European companies';
    const geo = item({ title: titular, axis: 'geopolitica' });
    const neg = item({ title: titular, axis: 'negocio' });
    assert.equal(relevanceScore(geo), relevanceScore(neg));
    const antes = item({ title: titular, axis: 'negocio', publishedAt: '2026-10-08T05:00:00.000Z' });
    const despues = item({ title: `${titular}, again`, axis: 'geopolitica', publishedAt: '2026-10-09T05:00:00.000Z' });
    assert.equal(rankLeads([antes, despues])[0], despues, 'a igual relevancia gana la más reciente, sea del eje que sea');
  });

  test('a igual relevancia, desempata la más reciente', () => {
    const a = item({ title: 'Startup raises funding for AI models', axis: 'ia', publishedAt: '2026-10-08T05:00:00.000Z' });
    const b = item({ title: 'Startup raises funding for AI models II', axis: 'ia', publishedAt: '2026-10-09T05:00:00.000Z' });
    assert.equal(pickLead([a, b]).status, 'lead');
    assert.equal((pickLead([a, b]) as { lead: unknown }).lead, b);
  });

  test('sin texto suficiente no hay protagonista, aunque sea la más relevante', () => {
    const sinTexto = item({
      title: 'AI jobs business boom for every company',
      axis: 'ia',
      textStatus: { sufficient: false, reason: 'paywall' },
    });
    const result = pickLead([sinTexto]);
    assert.equal(result.status, 'insufficient');
    assert.match((result as { reason: string }).reason, /paywall/);
  });

  test('una candidata de texto suficiente pero sin relación con IA/trabajo/negocio tampoco', () => {
    assert.equal(pickLead([item({ title: 'Local football derby ends in a draw', axis: 'geopolitica' })]).status, 'insufficient');
  });

  test('sin candidatas', () => {
    const result = pickLead([]);
    assert.equal(result.status, 'insufficient');
    assert.equal((result as { reason: string }).reason, 'no-candidates');
  });
});
