import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPROBACIONES_GEO,
  CRITERIOS_PROCESOS,
  EJEMPLO_GEO,
  EJEMPLO_INBOX,
  EJEMPLO_PROCESOS,
  FILAS_MAX,
  NOMBRE_MAX,
  PIEZAS,
  computeInbox,
  computeLista,
  computeProcesos,
  esPiezaConEmail,
  formatoInbox,
  formatoLista,
  formatoNumero,
  formatoProcesos,
  parseInbox,
  parseLista,
  parseProcesos,
} from '@/lib/piezas/registry';

/**
 * Los modelos de las piezas interactivas (fase 4). El navegador y el servidor
 * ejecutan este mismo código: el servidor vuelve a parsear y a calcular lo que
 * manda el lector antes de guardar nada o de citarlo en un correo. Si `parse`
 * aceptara algo que la pieza no puede producir, ese algo acabaría en un email
 * con el nombre del sitio.
 */

const fila = (nombre: string, notas: number[]) => ({ nombre, notas });

describe('prioridad-procesos: parse', () => {
  test('el ejemplo pasa su propio parse', () => {
    assert.deepEqual(parseProcesos(EJEMPLO_PROCESOS), EJEMPLO_PROCESOS);
  });

  test('rechaza notas fuera de 1–5, no enteras o en número distinto de criterios', () => {
    for (const notas of [[0, 3, 3, 3, 3], [6, 3, 3, 3, 3], [2.5, 3, 3, 3, 3], [3, 3, 3, 3], [3, 3, 3, 3, 3, 3], ['3', 3, 3, 3, 3]]) {
      assert.equal(parseProcesos({ filas: [fila('x', notas as number[])] }), null, JSON.stringify(notas));
    }
  });

  test('rechaza cero filas, más del máximo, y basura', () => {
    assert.equal(parseProcesos({ filas: [] }), null);
    const muchas = Array.from({ length: FILAS_MAX + 1 }, (_, i) => fila(`p${i}`, [3, 3, 3, 3, 3]));
    assert.equal(parseProcesos({ filas: muchas }), null);
    for (const basura of [null, 'x', 42, {}, { filas: 'x' }, { filas: [null] }, { filas: [{ nombre: 3, notas: [3, 3, 3, 3, 3] }] }]) {
      assert.equal(parseProcesos(basura), null, JSON.stringify(basura));
    }
  });

  test('recorta el nombre, limpia espacios y caracteres de control', () => {
    const largo = 'a'.repeat(NOMBRE_MAX + 40);
    const r = parseProcesos({ filas: [fila(`  ${largo}  `, [3, 3, 3, 3, 3]), fila('uno\n\tdos\u0000tres', [3, 3, 3, 3, 3])] });
    assert.ok(r);
    assert.equal(r.filas[0].nombre.length, NOMBRE_MAX);
    assert.equal(r.filas[1].nombre, 'uno dos tres');
  });

  test('un nombre vacío no se rechaza: sale como «Proceso N», igual que en pantalla', () => {
    const r = parseProcesos({ filas: [fila('   ', [3, 3, 3, 3, 3])] });
    assert.ok(r);
    assert.equal(computeProcesos(r).puestos[0].nombre, 'Proceso 1');
  });
});

describe('prioridad-procesos: orden y empates', () => {
  test('el ejemplo: gana el de más total, y a igual total desempata el riesgo', () => {
    const r = computeProcesos(EJEMPLO_PROCESOS);
    assert.deepEqual(
      r.puestos.map((p) => [p.puesto, p.nombre, p.total, p.riesgo]),
      [
        [1, 'Clasificar solicitudes entrantes', 19, 8],
        [2, 'Resumir reuniones en tareas', 18, 9],
        [3, 'Preparar el informe mensual', 18, 7],
      ],
    );
    assert.equal(r.maximo, CRITERIOS_PROCESOS.length * 5);
    assert.match(formatoProcesos(r).veredicto, /^Empieza por «Clasificar solicitudes entrantes»: suma 19 de 25\.$/);
  });

  test('empate total (mismo total y mismo riesgo): comparten puesto y lo dicen', () => {
    const r = computeProcesos({
      filas: [fila('A', [5, 1, 3, 3, 3]), fila('B', [1, 5, 3, 3, 3]), fila('C', [1, 1, 1, 1, 1])],
    });
    assert.deepEqual(r.puestos.map((p) => [p.nombre, p.puesto, p.empate]), [
      ['A', 1, true],
      ['B', 1, true],
      ['C', 3, false],
    ]);
    const f = formatoProcesos(r);
    assert.equal(f.filas[0].puesto, '1.º =');
    assert.equal(f.filas[2].puesto, '3.º');
    assert.match(f.veredicto, /^Empate arriba: «A» y «B» suman 15 de 25/);
  });

  test('a igual total gana el riesgo más controlable, aunque esté abajo en la lista', () => {
    const r = computeProcesos({ filas: [fila('Arriesgado', [5, 5, 3, 1, 1]), fila('Seguro', [3, 3, 3, 3, 3])] });
    assert.deepEqual(r.puestos.map((p) => p.nombre), ['Seguro', 'Arriesgado']);
    assert.ok(r.puestos.every((p) => !p.empate));
  });

  test('avisos del artículo: error caro, revisión imposible, o las dos', () => {
    const r = computeProcesos({
      filas: [fila('a', [3, 3, 3, 1, 5]), fila('b', [3, 3, 3, 5, 2]), fila('c', [3, 3, 3, 2, 1]), fila('d', [3, 3, 3, 3, 3])],
    });
    const aviso = (n: string) => r.puestos.find((p) => p.nombre === n)!.aviso;
    assert.match(aviso('a')!, /sale caro/);
    assert.match(aviso('b')!, /Nadie puede validar/);
    assert.match(aviso('c')!, /política y un dueño/);
    assert.equal(aviso('d'), null);
  });
});

describe('comprobaciones-geo (modo lista)', () => {
  test('son las nueve del ZIP, y el ejemplo marca la 3 y la 8', () => {
    assert.equal(COMPROBACIONES_GEO.length, 9);
    assert.deepEqual(EJEMPLO_GEO.hechas, [2, 7]);
    const r = computeLista(EJEMPLO_GEO);
    assert.deepEqual(r, { hechas: 2, total: 9, siguiente: 0, fundamentosPendientes: 2 });
    const f = formatoLista(r);
    assert.equal(f.cuenta, '2 de 9');
    assert.match(f.veredicto, /^Siguiente: la 1, «Cada URL pública responde 200 y no redirige»\. Las tres primeras/);
  });

  test('parse: índices enteros, únicos y dentro de rango; devuelve ordenado', () => {
    assert.deepEqual(parseLista({ hechas: [8, 0, 4] }), { hechas: [0, 4, 8] });
    for (const mal of [{ hechas: [9] }, { hechas: [-1] }, { hechas: [1, 1] }, { hechas: [1.5] }, { hechas: 'x' }, null, { hechas: Array.from({ length: 10 }, (_, i) => i) }]) {
      assert.equal(parseLista(mal), null, JSON.stringify(mal));
    }
  });

  test('con las tres primeras hechas ya no insiste en ellas; con todas, no hay siguiente', () => {
    const r = computeLista({ hechas: [0, 1, 2] });
    assert.equal(r.siguiente, 3);
    assert.doesNotMatch(formatoLista(r).veredicto, /tres primeras/);
    const todas = computeLista({ hechas: [0, 1, 2, 3, 4, 5, 6, 7, 8] });
    assert.equal(todas.siguiente, null);
    assert.match(formatoLista(todas).veredicto, /^Las nueve en orden/);
  });
});

describe('coste-entrada-manual (calculadora)', () => {
  test('el ejemplo del artículo da sus mismas cifras: 660 docs, 5.280 min, 88 h, 1.760 €', () => {
    const r = computeInbox(EJEMPLO_INBOX);
    assert.deepEqual(r, { docsMes: 660, minutosMes: 5280, horasMes: 88, costeMes: 1760 });
    const f = formatoInbox(r, EJEMPLO_INBOX);
    assert.deepEqual(
      [f.docsMes, f.minutosMes, f.horasMes, f.costeMes],
      ['660', '5.280', '88', '1.760 €'],
    );
    assert.equal(f.formula, '660 × 8 ÷ 60 × 20 € = 1.760 €');
  });

  test('parse: enteros dentro de los límites de cada campo, nada más', () => {
    assert.deepEqual(parseInbox(EJEMPLO_INBOX), EJEMPLO_INBOX);
    for (const mal of [
      { ...EJEMPLO_INBOX, docsDia: 0 },
      { ...EJEMPLO_INBOX, dias: 32 },
      { ...EJEMPLO_INBOX, minutos: 7.5 },
      { ...EJEMPLO_INBOX, eurosHora: '20' },
      { docsDia: 30, dias: 22, minutos: 8 },
      null,
    ]) {
      assert.equal(parseInbox(mal), null, JSON.stringify(mal));
    }
  });

  test('horas con decimal en formato español', () => {
    const e = { docsDia: 1, dias: 1, minutos: 90, eurosHora: 10 };
    const f = formatoInbox(computeInbox(e), e);
    assert.equal(f.horasMes, '1,5');
    assert.equal(f.costeMes, '15 €');
  });
});

describe('registro', () => {
  test('formatoNumero agrupa con punto también los de cuatro cifras', () => {
    assert.equal(formatoNumero(5280), '5.280');
    assert.equal(formatoNumero(1234567), '1.234.567');
    assert.equal(formatoNumero(999), '999');
    assert.equal(formatoNumero(87.5, 1), '87,5');
    assert.equal(formatoNumero(88, 1), '88');
  });

  test('solo «prioridad-procesos» viaja como magnet; las otras entregan un recurso existente', () => {
    assert.ok(esPiezaConEmail('prioridad-procesos'));
    assert.ok(!esPiezaConEmail('comprobaciones-geo'));
    assert.ok(!esPiezaConEmail('coste-entrada-manual'));
    assert.ok(!esPiezaConEmail('calculadora-coste-ia'));
    assert.deepEqual(Object.keys(PIEZAS).sort(), ['comprobaciones-geo', 'coste-entrada-manual', 'prioridad-procesos']);
  });
});
