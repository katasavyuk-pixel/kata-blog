import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { newsletters, sequenceEmails } from '#site/content';
import { ASUNTOS, EMPIEZA_CON_EMOJI } from '@/config/asuntos';

/**
 * Cada asunto que recibe un suscriptor empieza por un emoji que dice qué hay
 * dentro (Kata, 2026-10-16: «si el texto simple no da ganas de entrar al
 * correo…»). Las ediciones ya enviadas se quedan como salieron.
 */
describe('asuntos con emoji', () => {
  test('el regex reconoce un emoji con y sin selector de variante', () => {
    assert.match('🎁 Un regalo', EMPIEZA_CON_EMOJI);
    assert.match('⚙️ Un sistema', EMPIEZA_CON_EMOJI);
    assert.doesNotMatch('Un regalo 🎁', EMPIEZA_CON_EMOJI);
    assert.doesNotMatch('🎁Un regalo', EMPIEZA_CON_EMOJI);
  });

  test('la confirmación, la entrega del regalo y la de un recurso', () => {
    for (const asunto of Object.values(ASUNTOS)) assert.match(asunto, EMPIEZA_CON_EMOJI, asunto);
  });

  test('cada correo de la secuencia de bienvenida', () => {
    assert.ok(sequenceEmails.length > 0);
    for (const correo of sequenceEmails) assert.match(correo.subject, EMPIEZA_CON_EMOJI, correo.key);
  });

  test('cada edición aprobada que aún no ha salido', () => {
    for (const edicion of newsletters.filter((e) => !e.draft && !e.sent)) {
      assert.match(edicion.subject, EMPIEZA_CON_EMOJI, edicion.issue);
    }
  });

  test('el asunto que promete el regalo lo nombra dentro del correo, en HTML y en texto', () => {
    // Read from the source: the template is JSX, which this runner does not load.
    const plantilla = readFileSync(fileURLToPath(new URL('../src/emails/confirm-opt-in.tsx', import.meta.url)), 'utf8');
    assert.match(ASUNTOS.confirmacion, /regalo/);
    assert.match(plantilla, /Al confirmar te llega tu regalo: <strong>«\{REGALO\.titulo\}»<\/strong>/);
    assert.match(plantilla, /`Al confirmar te llega tu regalo: «\$\{REGALO\.titulo\}»\.`/);
  });
});
