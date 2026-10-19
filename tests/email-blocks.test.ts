import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resourceDeliveryBody } from '@/lib/email-blocks';
import { COST_MAGNET_SLUG } from '@/lib/cost-model';

/**
 * El correo de entrega sólo entrega lo que se acaba de pedir.
 *
 * Existe por un fallo visto en la bandeja el 2026-08-21: alguien pidió el prompt
 * de auditoría GEO y el email abrió con el desglose de una visita a la
 * calculadora de semanas antes, porque `getLatestSubmission` devuelve la última
 * fila de esa dirección, no la que corresponde a lo que se acaba de pedir. La
 * descarga estaba debajo y era correcta, y nadie habría bajado hasta ella.
 */

// La misma forma que guarda /api/subscribe: los INPUTS, no las cifras. El
// desglose se recalcula en servidor, que es lo que permite citarlo en un email
// sin estar repitiendo un número que mandó el navegador de otra persona.
const SUB_CALCULADORA = {
  email: 'x@example.com',
  magnetSlug: COST_MAGNET_SLUG,
  payload: { inputs: { modelId: 'gpt-4o-mini', inTok: 800, outTok: 400, reqs: 1000 } },
} as never;

describe('resourceDeliveryBody', () => {
  test('con descarga: entrega el botón y NADA de la calculadora', () => {
    const html = resourceDeliveryBody({
      downloadUrl: 'https://kata.ianexora.com/api/download?slug=maitreai-geo',
      downloadLabel: 'Prompt de auditoría GEO para tu negocio',
      submission: SUB_CALCULADORA,
    });

    assert.ok(html, 'con una descarga siempre hay cuerpo');
    assert.ok(html.includes('Prompt de auditoría GEO'), 'falta el botón de la descarga');
    assert.ok(
      !html.includes('Esto es lo que calculaste'),
      'el desglose de la calculadora no pinta nada en la entrega de un recurso',
    );
    assert.ok(!html.includes('coste_peticion'), 'tampoco la fórmula');
  });

  test('sin descarga pero con calculadora: el desglose ES la entrega', () => {
    const html = resourceDeliveryBody({
      downloadUrl: null,
      downloadLabel: 'x',
      submission: SUB_CALCULADORA,
    });
    assert.ok(html?.includes('Esto es lo que calculaste'));
  });

  test('sin nada que entregar: null, para no mandar un email vacío de promesa', () => {
    assert.equal(
      resourceDeliveryBody({ downloadUrl: null, downloadLabel: 'x', submission: null }),
      null,
    );
  });

  test('una submission que no es la calculadora tampoco es una entrega', () => {
    const otra = { email: 'x@example.com', magnetSlug: 'otro-imán', payload: {} } as never;
    assert.equal(
      resourceDeliveryBody({ downloadUrl: null, downloadLabel: 'x', submission: otra }),
      null,
    );
  });
});
