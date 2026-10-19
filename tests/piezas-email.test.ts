import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { bloquePieza, escaparLector, prioridadProcesos } from '@/lib/piezas/email';
import { openingBlock, resourceDeliveryBody } from '@/lib/email-blocks';
import { renderTemplate } from '@/lib/email-template';
import { EJEMPLO_PROCESOS } from '@/lib/piezas/registry';

/**
 * El correo que sigue a una pieza. Tres cosas que no pueden fallar:
 * lo que escribe el lector sale escapado (y sin llaves, que el motor de
 * plantillas tomaría por un placeholder sin resolver y se comería el email);
 * las cifras se recalculan en servidor y no se copian del navegador; y el
 * correo aporta algo que no estaba en pantalla.
 */

const sub = (inputs: unknown, extra: Record<string, unknown> = {}) =>
  ({ email: 'x@example.com', magnetSlug: 'prioridad-procesos', payload: { inputs, ...extra } }) as never;

describe('prioridad-procesos: bloque del correo', () => {
  test('lleva el orden con las notas y la hoja de medición del primero', () => {
    const html = prioridadProcesos({ inputs: EJEMPLO_PROCESOS });
    assert.ok(html);
    assert.ok(html.includes('Este es el orden que te salió'));
    assert.ok(html.includes('La hoja para medir «Clasificar solicitudes entrantes»'));
    // Lo que no está en pantalla: el registro de diez días y la fórmula del coste.
    assert.ok(html.includes('Interrupciones'));
    assert.ok(html.includes('coste = casos × minutos por caso ÷ 60 × coste por hora'));
    assert.equal((html.match(/<tr><td style="[^"]*">\d+<\/td>/g) ?? []).length, 10, 'diez filas de días');
  });

  test('escapa el nombre que escribe el lector, también las llaves', () => {
    const html = prioridadProcesos({
      inputs: { filas: [{ nombre: '<script>alert(1)</script> {{apertura_personalizada}}', notas: [5, 5, 5, 5, 5] }] },
    })!;
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!/\{\{/.test(html), 'unas llaves del lector no pueden llegar al motor de plantillas');
    // Y el email sigue saliendo: renderTemplate no lo confunde con un placeholder.
    assert.doesNotThrow(() => renderTemplate('<p>{{x}}</p>', { x: html }));
    assert.equal(escaparLector('{a}'), '&#123;a&#125;');
  });

  test('recalcula: un resultado inventado en el payload no llega al correo', () => {
    const html = prioridadProcesos({
      inputs: EJEMPLO_PROCESOS,
      result: { puestos: [{ nombre: 'Inventado', total: 99 }] },
    })!;
    assert.ok(!html.includes('Inventado'));
    assert.ok(!html.includes('99'));
    assert.ok(html.includes('19 / 25'));
  });

  test('entradas que no pasan el parse: ningún bloque, nunca uno a medias', () => {
    assert.equal(prioridadProcesos({ inputs: { filas: [{ nombre: 'x', notas: [9, 9, 9, 9, 9] }] } }), null);
    assert.equal(prioridadProcesos({}), null);
    assert.equal(bloquePieza(sub({ filas: [] })), null);
  });

  test('bloquePieza solo despacha slugs de piezas con email', () => {
    assert.ok(bloquePieza(sub(EJEMPLO_PROCESOS)));
    assert.equal(bloquePieza({ magnetSlug: 'comprobaciones-geo', payload: { inputs: { hechas: [] } } }), null);
    assert.equal(bloquePieza({ magnetSlug: 'calculadora-coste-ia', payload: {} }), null);
    assert.equal(bloquePieza(null), null);
  });
});

describe('despacho por slug en email-blocks', () => {
  test('la entrega sin descarga de una pieza ES su bloque', () => {
    const html = resourceDeliveryBody({ downloadUrl: null, downloadLabel: 'x', submission: sub(EJEMPLO_PROCESOS) });
    assert.ok(html?.includes('La hoja para medir'));
  });

  test('con descarga, la descarga manda y la pieza no se cuela', () => {
    const html = resourceDeliveryBody({
      downloadUrl: 'https://kata.ianexora.com/api/download?slug=maitreai-geo',
      downloadLabel: 'Prompt GEO',
      submission: sub(EJEMPLO_PROCESOS),
    })!;
    assert.ok(!html.includes('La hoja para medir'));
  });

  test('el primer correo de la secuencia abre con el bloque de la pieza', () => {
    assert.ok(openingBlock('https://kata.ianexora.com', sub(EJEMPLO_PROCESOS)).includes('Este es el orden que te salió'));
  });

  test('la calculadora de coste sigue exactamente igual', () => {
    const coste = {
      email: 'x@example.com',
      magnetSlug: 'calculadora-coste-ia',
      payload: { inputs: { modelId: 'gpt-4o-mini', inTok: 800, outTok: 400, reqs: 1000 } },
    } as never;
    const html = openingBlock('https://kata.ianexora.com', coste);
    assert.ok(html.startsWith('<p style="margin:0 0 16px;line-height:1.6;color:#140a0d;font-size:15px">Esto es lo que calculaste'));
    assert.ok(html.includes('$0.00036'));
    assert.ok(html.includes('$11'));
  });
});
