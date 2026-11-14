import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const leer = (file: string) => readFileSync(`${root}${file}`, 'utf8');

describe('el evento newsletter_alta', () => {
  test('solo se dispara en la página de confirmación, y no en el error ni en la previsualización', () => {
    const pagina = leer('src/app/gracias/page.tsx');
    assert.match(pagina, /<MarcaAlta \/>/);
    assert.match(pagina, /\{sp\.preview \? null : <MarcaAlta \/>\}/);
    // The error branch comes first and returns on its own: it must not import-track there.
    const error = pagina.slice(pagina.indexOf('if (sp.error)'), pagina.indexOf('return (\n    <Container className="py-16 sm:py-24">\n      {sp.preview'));
    assert.doesNotMatch(error, /MarcaAlta/);
  });

  test('usa el track ya existente, sin píxeles ni parámetros extra', () => {
    const fuente = leer('src/components/analytics/marca-alta.tsx');
    assert.match(fuente, /track\("newsletter_alta"\)/);
    assert.match(fuente, /@vercel\/analytics/);
    assert.doesNotMatch(fuente, /utm_|gtag|plausible|ga4/i);
    assert.doesNotMatch(fuente, /<img|facebook|googletagmanager/i);
  });

  test('privacidad y cookies dicen que esos eventos siguen sin cookies', () => {
    assert.match(leer('src/app/privacidad/page.tsx'), /confirmar la newsletter/);
    assert.match(leer('src/app/privacidad/page.tsx'), /sin cookies/);
    assert.match(leer('src/app/cookies/page.tsx'), /también sin cookies/);
  });
});
