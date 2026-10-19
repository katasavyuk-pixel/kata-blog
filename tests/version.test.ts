import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fechaDeVersion } from '@/lib/version';

/**
 * «Versión del …» en el pie (17-oct-2026). Con `new Date()` dentro de un
 * componente de cliente, el servidor y el navegador escribían días distintos y
 * React rehacía cada página al cargarla (error #418 en Lighthouse).
 */
describe('la fecha de versión del pie', () => {
  test('sale de la fecha del despliegue, en hora de Madrid', () => {
    // 23:30 UTC del 16 es ya el 17 en Madrid: el mismo resultado en cualquier zona.
    assert.deepEqual(fechaDeVersion('2026-10-16T23:30:00.000Z'), { anio: '2026', dia: '17 oct 2026' });
    assert.deepEqual(fechaDeVersion('2026-12-31T23:30:00.000Z'), { anio: '2027', dia: '1 ene 2027' });
  });

  test('sin la fecha del despliegue no se inventa una', () => {
    assert.throws(() => fechaDeVersion(''), /FECHA_DE_VERSION/);
  });

  test('el pie no vuelve a leer la hora del momento', () => {
    const pie = readFileSync(fileURLToPath(new URL('../src/components/layout/footer.tsx', import.meta.url)), 'utf8');
    assert.doesNotMatch(pie, /new Date\(/);
    assert.match(pie, /fechaDeVersion\(\)/);
    const config = readFileSync(fileURLToPath(new URL('../next.config.ts', import.meta.url)), 'utf8');
    assert.match(config, /env: \{ FECHA_DE_VERSION: new Date\(\)\.toISOString\(\) \}/);
  });
});
