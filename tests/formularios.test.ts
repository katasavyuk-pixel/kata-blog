import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { anclaDelFormulario, cuerpoConFormulario } from '@/lib/formularios';
import { allPosts } from '@/lib/posts';

/**
 * Un formulario por página (DESIGN.md, regla 4), contado en el artículo entero:
 * el cuerpo y su cierre. Hasta el 15-oct-2026 doce páginas publicadas pedían el
 * correo dos veces, porque el cierre ponía su formulario debajo del que ya
 * traía el cuerpo (todas las ediciones diarias, entre otras).
 *
 * Los formularios del cuerpo se cuentan en el MDX fuente, donde se escriben; el
 * cierre decide con el MDX compilado (src/lib/formularios.ts). Que los dos
 * digan lo mismo es lo que se comprueba aquí. Hace falta
 * `npm run build:content` antes, como en arquitectura.test.ts.
 */
const root = join(import.meta.dirname, '..');

function formulariosEnFuente(slug: string): number {
  const fuente = readFileSync(join(root, 'content', 'posts', `${slug}.mdx`), 'utf8');
  return (
    (fuente.match(/<SuscripcionInline\b/g) ?? []).length +
    (fuente.match(/<EnviarResultado\b/g) ?? []).length +
    (fuente.match(/<CostCalculator\b[^>]*\bcaptureMode\b/g) ?? []).length
  );
}

describe('un formulario por página, cuerpo y cierre juntos', () => {
  test('hay artículos con formulario en el cuerpo, o este bloque no prueba nada', () => {
    assert.ok(allPosts.some((post) => cuerpoConFormulario(post)));
    assert.ok(allPosts.some((post) => !cuerpoConFormulario(post)));
  });

  test('ningún cuerpo trae más de un formulario', () => {
    for (const post of allPosts) {
      assert.ok(formulariosEnFuente(post.slug) <= 1, `${post.slug}: más de un formulario en el cuerpo.`);
    }
  });

  test('el cierre pone el suyo solo si el cuerpo no tiene: siempre hay exactamente uno', () => {
    for (const post of allPosts) {
      const enCuerpo = formulariosEnFuente(post.slug);
      const enCierre = cuerpoConFormulario(post) ? 0 : 1;
      assert.equal(enCuerpo + enCierre, 1, `${post.slug}: ${enCuerpo} en el cuerpo y ${enCierre} en el cierre.`);
    }
  });

  test('el enlace del cierre apunta al formulario que hay', () => {
    for (const post of allPosts.filter((p) => cuerpoConFormulario(p))) {
      const fuente = readFileSync(join(root, 'content', 'posts', `${post.slug}.mdx`), 'utf8');
      const esperado = /<EnviarResultado\b/.test(fuente) ? '#enviar-resultado' : '#suscripcion';
      assert.equal(anclaDelFormulario(post), esperado, post.slug);
    }
  });
});
