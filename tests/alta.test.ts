import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { altaConfirmada } from '@/lib/alta';
import { hasOwnSignupForm } from '@/config/site';

const root = fileURLToPath(new URL('..', import.meta.url));
const leer = (file: string) => readFileSync(`${root}${file}`, 'utf8');

describe('el alta confirmada, para el marketplace', () => {
  test('en local, sin Supabase, el comando se sigue viendo', () => {
    assert.equal(altaConfirmada({ supabaseConfigurado: false, cookie: undefined }), true);
  });
  test('en producción solo cuenta la cookie de quien ya confirmó, no un valor vacío', () => {
    assert.equal(altaConfirmada({ supabaseConfigurado: true, cookie: undefined }), false);
    assert.equal(altaConfirmada({ supabaseConfigurado: true, cookie: '' }), false);
    assert.equal(altaConfirmada({ supabaseConfigurado: true, cookie: 'alguien@example.com' }), true);
  });
  test('el texto de la puerta es honesto: el repo es público y hay que confirmar el correo', () => {
    const fuente = leer('src/components/marketplace/instalar-tras-alta.tsx');
    assert.match(fuente, /repositorio\s+público/);
    assert.match(fuente, /email para confirmar/);
    assert.match(fuente, /CATALOGO_REPO_URL/);
    assert.doesNotMatch(fuente, /utm_/);
    assert.doesNotMatch(fuente, /Ivanovych/);
  });
  test('las lecciones del curso siguen en la página, sin esconderlas detrás del formulario', () => {
    const fuente = leer('src/app/empieza-aqui/page.tsx');
    assert.match(fuente, /<CourseList/);
    assert.match(fuente, /se pueden leer sin suscribirse/);
    assert.match(fuente, /SubscribeForm/);
  });
  test('marketplace y el curso tienen su formulario, así que el pie no añade otro', () => {
    assert.equal(hasOwnSignupForm('/marketplace'), true);
    assert.equal(hasOwnSignupForm('/marketplace/empezar'), true);
    assert.equal(hasOwnSignupForm('/empieza-aqui'), true);
    assert.equal(hasOwnSignupForm('/blog'), false);
  });
  test('la política de cookies nombra la cookie de confirmación, y dice que no mide', () => {
    const fuente = leer('src/app/cookies/page.tsx');
    assert.match(fuente, /nbi_subscriber/);
    assert.match(fuente, /No es una cookie de medición/);
  });
});
