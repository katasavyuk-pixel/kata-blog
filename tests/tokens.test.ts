import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateToken, hashToken, safeEqualHex } from '@/lib/tokens';

/**
 * Tokens de confirmación y baja.
 *
 * El token en claro solo viaja en el enlace del email; en la base solo se
 * guarda el sha256. Si `safeEqualHex` lanza en vez de devolver false ante
 * entrada malformada, una petición con basura tumba la ruta en vez de
 * rechazarse — y esa ruta es la de darse de baja, que por RFC 8058 tiene que
 * responder siempre.
 */

describe('generateToken', () => {
  test('es URL-safe: puede ir en un enlace sin escapar', () => {
    for (let i = 0; i < 50; i++) {
      const t = generateToken();
      assert.match(t, /^[A-Za-z0-9_-]+$/, `token no URL-safe: ${t}`);
      assert.equal(encodeURIComponent(t), t, 'no debe cambiar al codificarse');
    }
  });

  test('tiene entropía suficiente y no se repite', () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 500; i++) vistos.add(generateToken());
    assert.equal(vistos.size, 500, 'colisión en 500 tokens: el CSPRNG no lo es');
    // 32 bytes en base64url = 43 caracteres.
    assert.equal(generateToken().length, 43);
  });
});

describe('hashToken', () => {
  test('es estable y de 64 hex', () => {
    const t = generateToken();
    assert.equal(hashToken(t), hashToken(t));
    assert.match(hashToken(t), /^[0-9a-f]{64}$/);
  });

  test('tokens distintos dan hashes distintos', () => {
    assert.notEqual(hashToken('a'), hashToken('b'));
  });
});

describe('safeEqualHex', () => {
  test('acepta iguales y rechaza distintos', () => {
    const h = hashToken('token-de-prueba');
    assert.equal(safeEqualHex(h, h), true);
    assert.equal(safeEqualHex(h, hashToken('otro')), false);
  });

  // Lo que importa: NO lanzar. La ruta de baja tiene que contestar siempre,
  // incluso a una petición con basura.
  test('entrada malformada devuelve false en vez de lanzar', () => {
    const h = hashToken('x');
    for (const basura of ['', 'zz', 'no-es-hex', 'a', 'a'.repeat(63), 'a'.repeat(65), '../../etc/passwd']) {
      assert.doesNotThrow(() => safeEqualHex(basura, h), `lanzó con ${JSON.stringify(basura)}`);
      assert.equal(safeEqualHex(basura, h), false);
      assert.doesNotThrow(() => safeEqualHex(h, basura));
      assert.equal(safeEqualHex(h, basura), false);
    }
  });

  test('longitudes distintas no lanzan', () => {
    // timingSafeEqual lanza si los buffers difieren en longitud: por eso hay
    // una comprobación previa, y por eso se testea.
    assert.equal(safeEqualHex('aabb', 'aabbcc'), false);
  });
});
