import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PUBLICACIONES_LINKEDIN, urlDePublicacion } from '@/config/linkedin';

/**
 * Las publicaciones de LinkedIn en el sitio (2026-10-15). Son palabras de Kata:
 * aquí se comprueba lo que se puede comprobar sin él.
 */
describe('LinkedIn en el sitio', () => {
  test('la fecha de cada publicación es la que lleva su id', () => {
    // El id de una actividad de LinkedIn guarda los milisegundos por encima del bit 22.
    for (const p of PUBLICACIONES_LINKEDIN) {
      const ms = Number(BigInt(p.id) >> BigInt(22));
      assert.equal(new Date(ms).toISOString().slice(0, 10), p.fecha, p.id);
    }
  });

  test('de la más nueva a la más vieja, sin repetir', () => {
    const fechas = PUBLICACIONES_LINKEDIN.map((p) => p.fecha);
    assert.deepEqual(fechas, [...fechas].sort().reverse());
    assert.equal(new Set(PUBLICACIONES_LINKEDIN.map((p) => p.id)).size, PUBLICACIONES_LINKEDIN.length);
  });

  test('ninguna habla en plural de empresa ni lleva emojis', () => {
    // Reglas de voz: ni «somos», ni «mi equipo», ni «la empresa», ni el plural de cortesía.
    for (const p of PUBLICACIONES_LINKEDIN) {
      assert.doesNotMatch(p.extracto, /\b(somos|mi equipo|nuestr[oa]s?|hacemos|ayudamos|estamos|tenemos|observamos|dirijo una empresa)\b/i, p.id);
      assert.doesNotMatch(p.extracto, /\p{Extended_Pictographic}/u, p.id);
    }
  });

  test('el vídeo vertical del 4 de septiembre no está', () => {
    assert.ok(!PUBLICACIONES_LINKEDIN.some((p) => p.id === '7501663818146594816'));
  });

  test('cada tarjeta lleva a la publicación en LinkedIn', () => {
    assert.equal(
      urlDePublicacion({ id: '7516523663756566531' }),
      'https://www.linkedin.com/feed/update/urn:li:activity:7516523663756566531/',
    );
  });
});
