import { test } from 'node:test';
import assert from 'node:assert/strict';
import robots from '@/app/robots';

/**
 * Los agentes de búsqueda y de usuario de Anthropic tienen grupo propio
 * (17-oct-2026), con las mismas rutas privadas que el resto: un bot con grupo
 * propio no lee el de `*`. No cambia lo que pueden leer: ya entraban por `*`.
 */
test('Claude-SearchBot y Claude-User tienen grupo, con las rutas privadas de siempre', () => {
  const reglas = [robots().rules].flat();
  const todos = reglas.find((r) => r.userAgent === '*');
  assert.ok(todos);
  for (const bot of ['Claude-SearchBot', 'Claude-User']) {
    const grupo = reglas.find((r) => r.userAgent === bot);
    assert.ok(grupo, `${bot} no tiene grupo.`);
    assert.equal(grupo.allow, '/');
    assert.deepEqual(grupo.disallow, todos.disallow);
  }
});
