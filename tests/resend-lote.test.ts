import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { aceptadosDelLote } from '@/lib/resend-lote';

/**
 * El recuento de un lote de Resend, con la forma real de la respuesta.
 *
 * El 2026-10-15 el primer envío de verdad dijo «0 enviados y 5 fallidos de 5»
 * sin ningún error de Resend: el código leía `data.length` y la lista de
 * aceptados está en `data.data`. Ningún test lo vio porque el del panel
 * sustituye el envío entero. Aquí se fija la forma que declaran los tipos de
 * la propia librería (CreateBatchSuccessResponse), y se comprueba que el envío
 * usa esta función y no vuelve a leer la respuesta a mano.
 */
const root = join(import.meta.dirname, '..');

describe('recuento de un lote de Resend', () => {
  test('cinco aceptados son cinco enviados', () => {
    const respuesta = { data: { data: [1, 2, 3, 4, 5].map((n) => ({ id: `em_${n}` })) }, error: null };
    assert.equal(aceptadosDelLote(respuesta, 5), 5);
  });

  test('con error de Resend no cuenta ninguno', () => {
    assert.equal(aceptadosDelLote({ data: null, error: { statusCode: 422, message: 'invalid' } }, 5), 0);
  });

  test('una respuesta parcial cuenta los que llegaron, nunca más que el lote', () => {
    assert.equal(aceptadosDelLote({ data: { data: [{ id: 'a' }, { id: 'b' }] }, error: null }, 5), 2);
    assert.equal(aceptadosDelLote({ data: { data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, error: null }, 2), 2);
  });

  test('la forma que se fija aquí es la que declara la librería instalada', () => {
    const tipos = readFileSync(join(root, 'node_modules', 'resend', 'dist', 'index.d.mts'), 'utf8');
    const inicio = tipos.indexOf('type CreateBatchSuccessResponse');
    assert.ok(inicio >= 0, 'resend ya no exporta CreateBatchSuccessResponse: revisa la forma de la respuesta.');
    assert.match(tipos.slice(inicio, inicio + 200), /=\s*\{\s*data:\s*\{/, 'la lista de aceptados ya no está en data.data');
  });

  test('el envío cuenta con esta función, no leyendo la respuesta a mano', () => {
    const envio = readFileSync(join(root, 'src', 'lib', 'newsletter.tsx'), 'utf8');
    assert.match(envio, /aceptadosDelLote\(/);
    assert.doesNotMatch(envio, /data\?\.length/);
  });
});
