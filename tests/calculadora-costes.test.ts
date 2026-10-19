import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COST_DEFAULTS,
  COST_MODELS,
  COST_MODELS_OFFERED,
  COST_PRICE_SOURCES,
  COST_PRICES_CHECKED,
  COST_PRICES_MAX_AGE_DAYS,
  computeCost,
  parseCostInputs,
} from '@/lib/cost-model';
import { readCostPayload } from '@/lib/lead-magnets';

/**
 * Los precios de la calculadora son una afirmación con fecha.
 *
 * Hasta el 13 de octubre de 2026 la tabla decía «Claude Haiku, 0,80 $ / 4 $»,
 * sin versión y sin fecha: era el precio de un modelo ya retirado, ocho veces
 * el del vigente. El artículo sacaba de ahí dos proporciones («15–20», «3–4×»)
 * que tampoco eran ya ciertas. Aquí se atan las tres cosas: la tabla lleva
 * fecha y fuente, caduca, y lo que el texto dice sale de la tabla.
 */

const ROOT = join(import.meta.dirname, '..');
const DIA = 24 * 60 * 60 * 1000;

describe('la tabla de precios', () => {
  test('lleva fecha y la página de precios de cada proveedor', () => {
    assert.match(COST_PRICES_CHECKED, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number.isFinite(Date.parse(COST_PRICES_CHECKED)));
    const dominios = COST_PRICE_SOURCES.map((s) => new URL(s.url).hostname);
    assert.deepEqual(dominios, ['platform.claude.com', 'developers.openai.com']);
    for (const { url } of COST_PRICE_SOURCES) assert.match(url, /^https:\/\/.+pricing/);
  });

  test('caduca: pasado el plazo hay que volver a leer las dos páginas', () => {
    const dias = Math.floor((Date.now() - Date.parse(COST_PRICES_CHECKED)) / DIA);
    assert.ok(dias >= 0, 'la fecha de los precios está en el futuro');
    assert.ok(
      dias <= COST_PRICES_MAX_AGE_DAYS,
      `Los precios de la calculadora se leyeron hace ${dias} días (${COST_PRICES_CHECKED}). ` +
        `Vuelve a leer las páginas de COST_PRICE_SOURCES, corrige las filas de COST_MODELS y ` +
        `cambia COST_PRICES_CHECKED en el mismo commit (src/lib/cost-model.ts).`,
    );
  });

  test('cada fila es un modelo distinto con precios que tienen sentido', () => {
    assert.equal(new Set(COST_MODELS.map((m) => m.id)).size, COST_MODELS.length);
    for (const m of COST_MODELS) {
      assert.ok(m.in > 0 && m.out > 0, m.id);
      assert.ok(m.out >= m.in, `${m.id}: la salida nunca ha sido más barata que la entrada`);
    }
  });

  test('lo que se ofrece son los modelos leídos ese día, con su versión en el nombre', () => {
    assert.ok(COST_MODELS_OFFERED.length >= 4);
    for (const m of COST_MODELS_OFFERED) {
      assert.match(m.label, /\d/, `${m.label}: un modelo sin versión no dice de cuándo es su precio`);
    }
    assert.ok(COST_MODELS_OFFERED.some((m) => m.id === COST_DEFAULTS.modelId), 'el modelo por defecto tiene que estar en el selector');
  });
});

describe('lo que alguien calculó antes sigue valiendo', () => {
  // El correo de bienvenida vuelve a hacer la cuenta desde lo guardado.
  const guardado = { inputs: { modelId: 'gpt-4o-mini', inTok: 800, outTok: 400, reqs: 1000 } };

  test('un modelo que ya no se ofrece se resuelve con el precio que tenía', () => {
    assert.equal(COST_MODELS_OFFERED.some((m) => m.id === 'gpt-4o-mini'), false);
    const leido = readCostPayload(guardado);
    assert.equal(leido?.modelLabel, 'GPT-4o mini');
    assert.equal(leido?.perMonth, '$11');
  });

  test('un modelo que no ha existido nunca en la tabla se rechaza', () => {
    assert.equal(parseCostInputs({ ...guardado.inputs, modelId: 'gpt-9' }), null);
    assert.equal(readCostPayload({ inputs: { ...guardado.inputs, modelId: 'gpt-9' } }), null);
  });

  test('la cuenta por defecto', () => {
    const { perReq, perMonth } = computeCost(COST_DEFAULTS);
    // 800 de entrada a 0,10 $ y 400 de salida a 0,50 $, por millón.
    assert.equal(perReq.toFixed(5), '0.00028');
    assert.equal(perMonth.toFixed(2), '8.40');
  });
});

describe('lo que el artículo afirma sale de la tabla', () => {
  const articulo = readFileSync(join(ROOT, 'content/posts/cuanto-cuesta-la-ia.mdx'), 'utf8');
  const palabras: Record<number, string> = { 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho' };

  test('«un token de salida cuesta N veces uno de entrada», en todos los modelos que dice', () => {
    const [, cuantos, veces] = articulo.match(/En los (\w+) modelos de la tabla, un <Term id="token">token<\/Term> de salida cuesta (\w+) veces/) ?? [];
    assert.ok(cuantos && veces, 'la frase ha cambiado: este test hay que rehacerlo con ella');
    assert.equal(cuantos, palabras[COST_MODELS_OFFERED.length]);
    const proporciones = new Set(COST_MODELS_OFFERED.map((m) => m.out / m.in));
    assert.deepEqual([...proporciones].map((p) => palabras[p]), [veces]);
  });

  test('«del pequeño al mediano por 20, y al más grande por 100», en las dos casas', () => {
    const [, mediano, grande] = articulo.match(/al mediano multiplica la factura por (\d+), y al más grande por (\d+)/) ?? [];
    assert.ok(mediano && grande, 'la frase ha cambiado: este test hay que rehacerlo con ella');
    const precio = (id: string) => COST_MODELS_OFFERED.find((m) => m.id === id)!;
    const casas = [
      ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-fable-5-1'],
      ['gpt-6-luna', 'gpt-6-1-sol', 'gpt-6-astra'],
    ];
    for (const [p, m, g] of casas) {
      for (const lado of ['in', 'out'] as const) {
        assert.equal(Math.round(precio(m)[lado] / precio(p)[lado]), Number(mediano), `${p} → ${m} (${lado})`);
        assert.equal(Math.round(precio(g)[lado] / precio(p)[lado]), Number(grande), `${p} → ${g} (${lado})`);
      }
    }
  });

  test('enseña la tabla y dice que el artículo se ha tocado', () => {
    assert.match(articulo, /<PreciosModelos \/>/);
    assert.match(articulo, new RegExp(`^updated: ${COST_PRICES_CHECKED}$`, 'm'));
  });
});
