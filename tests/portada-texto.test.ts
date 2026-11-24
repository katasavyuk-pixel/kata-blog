import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { esNuevo, tituloEnFrase } from '@/lib/portada-texto';

describe('tituloEnFrase', () => {
  test('normaliza títulos en Title Case y conserva la primera palabra', () => {
    assert.equal(
      tituloEnFrase('Empresarios Proponen Reducir Cargas…'),
      'Empresarios proponen reducir cargas…',
    );
  });

  test('no transforma títulos que no parecen Title Case', () => {
    assert.equal(tituloEnFrase('La noticia del día'), 'La noticia del día');
    assert.equal(tituloEnFrase('Empresarios proponen reducir cargas'), 'Empresarios proponen reducir cargas');
  });

  test('conserva siglas y palabras con mayúsculas internas', () => {
    assert.equal(
      tituloEnFrase('Empresarios Proponen IA Para CEO Y OpenAI'),
      'Empresarios proponen IA para CEO y OpenAI',
    );
  });
});

describe('esNuevo', () => {
  const ahora = new Date('2026-10-14T12:00:00.000Z');

  test('incluye publicaciones dentro de los últimos siete días y el límite', () => {
    assert.equal(esNuevo('2026-10-14T11:00:00.000Z', ahora), true);
    assert.equal(esNuevo('2026-10-07T12:00:00.000Z', ahora), true);
    assert.equal(esNuevo('2026-10-07T11:59:59.999Z', ahora), false);
  });

  test('admite un plazo explícito y excluye fechas futuras o inválidas', () => {
    assert.equal(esNuevo('2026-10-12T12:00:00.000Z', ahora, 2), true);
    assert.equal(esNuevo('2026-10-11T12:00:00.000Z', ahora, 2), false);
    assert.equal(esNuevo('2026-10-15T12:00:00.000Z', ahora), false);
    assert.equal(esNuevo('no-es-una-fecha', ahora), false);
  });
});
