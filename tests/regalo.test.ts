import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { DONDE_SE_PEGA, FICHA, REGALO } from '@/config/regalo';
import { siteConfig } from '@/config/site';
import { bloquesDeDescarga, regaloBlock } from '@/lib/email-blocks';

/**
 * El regalo de alta: «Recupera horas de tu semana con IA» (2026-10-16).
 *
 * Lo que se prueba es lo que podría salir mal sin que nadie lo viera: que el
 * correo prometa un regalo que no puede dar, que quien vino a por la hoja la
 * reciba dos veces, que la fila de Supabase apunte a un archivo que no está en
 * el repo, y que «dónde se pega» se quede viejo sin que nadie lo vuelva a mirar.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const SITIO = 'https://sitio.example';
const HOJA = 'https://sitio.example/api/download?slug=hoja-de-tu-semana&sig=x';

describe('el regalo en el primer correo', () => {
  test('sin la hoja publicada no se promete nada', () => {
    assert.equal(regaloBlock(null, SITIO), '');
    assert.deepEqual(
      bloquesDeDescarga({ siteUrl: SITIO, downloadUrl: null, downloadLabel: 'x', regaloUrl: null }),
      { bloque_descarga: '', bloque_regalo: '' },
    );
  });

  test('publicada: la hoja para descargar y la ficha en la web, con «IA» en mayúsculas', () => {
    const html = regaloBlock(HOJA, SITIO);
    assert.ok(html.includes(`href="${HOJA.replace(/&/g, '&amp;')}"`), 'el botón lleva el enlace firmado.');
    assert.ok(html.includes(`href="${SITIO}${REGALO.ficha.href}"`), 'la ficha va con la dirección completa.');
    assert.match(html, /Tu regalo: Recupera horas de tu semana con IA/);
    assert.match(html, /Descargar la hoja de tu semana/);
    assert.match(html, /Abrir tu ficha para la IA/);
    assert.doesNotMatch(html.replace(/href="[^"]*"/g, ''), /\bia\b/, 'ninguna «ia» en minúsculas en lo que se lee.');
  });

  test('quien vino a por otro recurso recibe los dos; quien vino a por la hoja, una vez', () => {
    const otro = bloquesDeDescarga({
      siteUrl: SITIO,
      downloadUrl: 'https://sitio.example/api/download?slug=otro',
      downloadLabel: 'Otro recurso',
      downloadSlug: 'otro',
      regaloUrl: HOJA,
    });
    assert.match(otro.bloque_descarga, /Otro recurso/);
    assert.match(otro.bloque_regalo, /Tu regalo/);

    const laHoja = bloquesDeDescarga({
      siteUrl: SITIO,
      downloadUrl: HOJA,
      downloadLabel: 'La hoja de tu semana',
      downloadSlug: REGALO.hoja.slug,
      regaloUrl: HOJA,
    });
    assert.equal(laHoja.bloque_descarga, '');
    assert.equal((laHoja.bloque_regalo.match(/Descargar la hoja de tu semana/g) ?? []).length, 1);
  });

  test('el correo de bienvenida lleva el hueco del regalo después de la descarga', () => {
    const bienvenida = readFileSync(join(root, 'content/emails/01-bienvenida.md'), 'utf8');
    assert.ok(bienvenida.indexOf('{{bloque_descarga}}') < bienvenida.indexOf('{{bloque_regalo}}'));
  });
});

describe('la hoja', () => {
  test('la fila de Supabase apunta a un archivo que existe en el repo', () => {
    const seed = readFileSync(join(root, 'supabase/seeds/resources.sql'), 'utf8');
    const fila = seed.slice(seed.indexOf(`'${REGALO.hoja.slug}',`));
    assert.match(fila, new RegExp(`^'${REGALO.hoja.slug}',\\s*'${REGALO.hoja.titulo}',`));
    const ruta = fila.match(/'([^']+\.xlsx)'/)?.[1];
    assert.equal(ruta, `${REGALO.hoja.slug}/hoja-de-tu-semana.xlsx`);
    assert.ok(existsSync(join(root, 'lead-magnets/recupera-horas/hoja-de-tu-semana.xlsx')), 'falta el .xlsx generado.');
  });
});

describe('la ficha', () => {
  test('ocupa lo que dice la página («unos 900 caracteres»)', () => {
    assert.ok(FICHA.length >= 800 && FICHA.length <= 1000, `mide ${FICHA.length}`);
    const pagina = readFileSync(join(root, 'src/app/herramientas/ficha-para-tu-ia/page.tsx'), 'utf8');
    assert.match(pagina, /unos 900 caracteres/);
  });

  test('«dónde se pega» se vuelve a comprobar antes de 120 días', () => {
    const dias = (Date.now() - Date.parse(`${DONDE_SE_PEGA.comprobado}T00:00:00Z`)) / 86_400_000;
    assert.ok(dias <= 120, `Comprobado el ${DONDE_SE_PEGA.comprobado}: vuelve a leer la ayuda de ChatGPT, Claude y Gemini y actualiza la fecha.`);
    for (const asistente of DONDE_SE_PEGA.asistentes) assert.match(asistente.fuente, /^https:\/\//);
  });

  test('los formularios principales dicen qué te llevas', () => {
    assert.match(siteConfig.newsletter.regalo, new RegExp(REGALO.titulo));
    for (const fichero of ['src/components/home/hero.tsx', 'src/app/newsletter/page.tsx']) {
      assert.match(readFileSync(join(root, fichero), 'utf8'), /siteConfig\.newsletter\.regalo/, fichero);
    }
  });
});

describe('quien ya estaba suscrito', () => {
  // Read from the source: the route needs Supabase, Resend and Turnstile. What
  // matters is that a confirmed address is never answered with silence again.
  const ruta = readFileSync(join(root, 'src/app/api/subscribe/route.ts'), 'utf8');
  const confirmado = ruta.slice(ruta.indexOf('if (existing?.status === "confirmed")'), ruta.indexOf('const token = generateToken()'));

  test('si se vuelve a apuntar desde un formulario sin recurso, recibe el regalo', () => {
    assert.match(confirmado, /resource: magnet \? body\.resource : REGALO\.hoja\.slug/);
    assert.doesNotMatch(confirmado, /if \(magnet\)/, 'ya no se queda callado cuando no pidió nada concreto.');
  });

  test('la entrega del regalo lleva su bloque, con la ficha', () => {
    const lib = readFileSync(join(root, 'src/lib/welcome-sequence.tsx'), 'utf8');
    const entrega = lib.slice(lib.indexOf('export async function sendResourceDelivery'));
    assert.match(entrega, /const regaloUrl = sub\.resource === REGALO\.hoja\.slug \? ctx\.regaloUrl : null;/);
    assert.match(entrega, /regaloUrl\s*\? regaloBlock\(regaloUrl, ctx\.siteUrl\)/);
    assert.match(entrega, /subject: regaloUrl \? ASUNTOS\.regalo : ASUNTOS\.recurso/, 'el asunto dice que es el regalo.');
  });
});

