import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { signedDownloadUrl, verifyDownloadSignature, isDownloadSigningConfigured } from '@/lib/signed-links';

/**
 * Enlaces de descarga firmados.
 *
 * Es lo que decide si el botón de un email entrega o no un lead magnet, y por
 * tanto lo más cercano a un control de acceso que tiene este repo. Hasta ahora
 * no había ni un test: `npm run build` caza MDX roto, no una firma que valida
 * cuando no debe.
 */

const SECRETO = 'secreto-de-prueba-no-usar-en-produccion';
const SITIO = 'https://kataivanovych.com';
const previo = process.env.DOWNLOAD_LINK_SECRET;

beforeEach(() => {
  process.env.DOWNLOAD_LINK_SECRET = SECRETO;
});
afterEach(() => {
  if (previo === undefined) delete process.env.DOWNLOAD_LINK_SECRET;
  else process.env.DOWNLOAD_LINK_SECRET = previo;
});

function partes(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

describe('firma de enlaces de descarga', () => {
  test('un enlace recién firmado se verifica', () => {
    const url = signedDownloadUrl(SITIO, 'guia-ia', 'kata@ejemplo.com')!;
    const p = partes(url);
    assert.equal(
      verifyDownloadSignature('guia-ia', 'kata@ejemplo.com', p.get('exp'), p.get('sig')),
      true,
    );
  });

  test('sin secreto configurado no firma y no valida (falla cerrado)', () => {
    delete process.env.DOWNLOAD_LINK_SECRET;
    assert.equal(isDownloadSigningConfigured(), false);
    assert.equal(signedDownloadUrl(SITIO, 'guia-ia', 'kata@ejemplo.com'), null);
    // Y sobre todo: sin secreto NO se puede validar nada, ni siquiera una firma
    // vacía. Un fallo abierto aquí regalaría todos los lead magnets.
    assert.equal(verifyDownloadSignature('guia-ia', 'kata@ejemplo.com', '9999999999999', 'aabb'), false);
  });

  test('cambiar el slug invalida la firma', () => {
    const url = signedDownloadUrl(SITIO, 'guia-ia', 'kata@ejemplo.com')!;
    const p = partes(url);
    assert.equal(
      verifyDownloadSignature('otro-recurso', 'kata@ejemplo.com', p.get('exp'), p.get('sig')),
      false,
      'con el slug cambiado se descargaría un recurso distinto al autorizado',
    );
  });

  test('cambiar el email invalida la firma', () => {
    const url = signedDownloadUrl(SITIO, 'guia-ia', 'kata@ejemplo.com')!;
    const p = partes(url);
    assert.equal(
      verifyDownloadSignature('guia-ia', 'otro@ejemplo.com', p.get('exp'), p.get('sig')),
      false,
      'reenviar el enlace a otra persona no puede autorizarla',
    );
  });

  test('alargar la caducidad invalida la firma', () => {
    const url = signedDownloadUrl(SITIO, 'guia-ia', 'kata@ejemplo.com')!;
    const p = partes(url);
    const masTarde = String(Number(p.get('exp')) + 86_400_000);
    assert.equal(
      verifyDownloadSignature('guia-ia', 'kata@ejemplo.com', masTarde, p.get('sig')),
      false,
      'exp va dentro del HMAC, así que no se puede estirar por la URL',
    );
  });

  test('una firma caducada se rechaza', () => {
    const hace40Dias = Date.now() - 40 * 24 * 60 * 60 * 1000;
    const url = signedDownloadUrl(SITIO, 'guia-ia', 'kata@ejemplo.com', hace40Dias)!;
    const p = partes(url);
    assert.equal(
      verifyDownloadSignature('guia-ia', 'kata@ejemplo.com', p.get('exp'), p.get('sig')),
      false,
      'el TTL es de 30 días',
    );
  });

  test('rotar el secreto invalida los enlaces ya enviados', () => {
    // Es el mecanismo de revocación documentado en el propio módulo: si deja de
    // funcionar, no hay forma de retirar un enlace que ya está en una bandeja.
    const url = signedDownloadUrl(SITIO, 'guia-ia', 'kata@ejemplo.com')!;
    const p = partes(url);
    process.env.DOWNLOAD_LINK_SECRET = 'secreto-rotado';
    assert.equal(
      verifyDownloadSignature('guia-ia', 'kata@ejemplo.com', p.get('exp'), p.get('sig')),
      false,
    );
  });

  test('una firma malformada no revienta, devuelve false', () => {
    const url = signedDownloadUrl(SITIO, 'guia-ia', 'kata@ejemplo.com')!;
    const p = partes(url);
    for (const basura of ['', 'no-es-hex', 'zz', 'a'.repeat(63), 'a'.repeat(65)]) {
      assert.equal(
        verifyDownloadSignature('guia-ia', 'kata@ejemplo.com', p.get('exp'), basura),
        false,
        `sig=${JSON.stringify(basura)} debe rechazarse sin lanzar`,
      );
    }
    for (const basura of ['', 'ayer', 'NaN', '-1']) {
      assert.equal(verifyDownloadSignature('guia-ia', 'kata@ejemplo.com', basura, p.get('sig')), false);
    }
    assert.equal(verifyDownloadSignature('guia-ia', 'kata@ejemplo.com', null, null), false);
  });

  test('la URL lleva todo lo que la ruta necesita', () => {
    const url = signedDownloadUrl(SITIO, 'guia-ia', 'kata@ejemplo.com')!;
    assert.ok(url.startsWith(`${SITIO}/api/download?`));
    const p = partes(url);
    assert.equal(p.get('slug'), 'guia-ia');
    assert.equal(p.get('e'), 'kata@ejemplo.com');
    assert.match(p.get('sig')!, /^[0-9a-f]{64}$/);
    assert.ok(Number(p.get('exp')) > Date.now());
  });

  test('emails con caracteres especiales sobreviven al viaje por la URL', () => {
    const email = 'kata+newsletter@ejemplo.com';
    const url = signedDownloadUrl(SITIO, 'guia-ia', email)!;
    const p = partes(url);
    assert.equal(p.get('e'), email, 'el + no puede convertirse en espacio');
    assert.equal(verifyDownloadSignature('guia-ia', p.get('e')!, p.get('exp'), p.get('sig')), true);
  });
});
