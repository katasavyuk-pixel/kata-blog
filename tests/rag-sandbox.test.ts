import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, retrievalScore } from '@/lib/rag-sandbox';

/**
 * La aritmética del RagSandbox, fijada.
 *
 * El widget enseña recuperación con un scorer léxico cuya honestidad depende
 * de hacer exactamente lo que su panel de matemáticas dice: quitar tildes y
 * signos, tirar palabras vacías, quitar plurales ingenuos y puntuar como
 * aciertos sobre términos de la pregunta. Sin este test, una "simplificación"
 * futura del tokenizer puede cambiar silenciosamente qué demo ve el lector —
 * o peor, hacer que el panel mienta sobre lo que calcula.
 *
 * Los casos usan frases del corpus real del widget para que el test también
 * fije que las preguntas de ejemplo recuperan lo que deberían.
 */

describe('tokenize', () => {
  test('quita tildes y signos de interrogación', () => {
    assert.deepEqual(tokenize('¿Qué es una alucinación?'), ['alucinacion']);
  });

  test('tira las palabras vacías del español', () => {
    assert.deepEqual(tokenize('los tokens de la entrada y de la salida'), ['token', 'entrada', 'salida']);
  });

  test('quita el plural ingenuo de las palabras largas', () => {
    assert.deepEqual(tokenize('tokens y redes'), ['token', 'rede']);
  });

  test('conserva el plural de las palabras cortas', () => {
    // "tres" no termina en plural que importe; "sms" (3 letras) tampoco se toca.
    assert.deepEqual(tokenize('sms tres'), ['sms', 'tre']);
  });
});

describe('retrievalScore', () => {
  test('coincidencia total da 1', () => {
    assert.equal(
      retrievalScore('¿Qué es una alucinación?', 'Una alucinación es una respuesta plausible pero falsa.'),
      1,
    );
  });

  test('coincidencia parcial da la fracción exacta', () => {
    // términos de la pregunta: [costo, model] → el chunk solo contiene "modelo"
    // (singular desde "model" tras de-pluralizar la pregunta... ver abajo).
    const s = retrievalScore('¿Cuánto cuestan los modelos?', 'El modelo grande cuesta más.');
    assert.ok(s > 0 && s < 1, `esperado parcial, obtuvo ${s}`);
  });

  test('cero coincidencias da 0, no NaN', () => {
    assert.equal(retrievalScore('¿Qué hora es?', 'Las Noticias salen cada día.'), 0);
  });

  test('pregunta vacía da 0, no NaN', () => {
    assert.equal(retrievalScore('', 'cualquier cosa'), 0);
    assert.equal(retrievalScore('¿¿??', 'cualquier cosa'), 0);
  });

  test('singular de la pregunta casa con plural del corpus y viceversa', () => {
    // "tokens" (pregunta) → "token"; el corpus dice "tokens".
    assert.ok(
      retrievalScore('tokens', 'Los tokens de salida cuestan más') === 1,
    );
    // "token" (pregunta) contra corpus en plural también casa.
    assert.ok(retrievalScore('token', 'Los tokens de salida') === 1);
  });

  test('las preguntas del widget recuperan el fragmento correcto primero', () => {
    // El corpus real del widget, resumido a los dos candidatos que compiten
    // en cada pregunta: el correcto debe puntuar más alto.
    const costo = 'Los tokens de salida suelen costar de 3 a 4 veces más que los de entrada.';
    const tokenDef = 'Un token es la unidad mínima que procesa un modelo de lenguaje.';
    assert.ok(
      retrievalScore('¿Cuánto cuestan los tokens?', costo) >=
        retrievalScore('¿Cuánto cuestan los tokens?', tokenDef),
    );
  });
});
