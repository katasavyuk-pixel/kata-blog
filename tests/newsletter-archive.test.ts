import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { sentIssues } from '@/lib/newsletter-archive';
import { newsletters } from '#site/content';

/**
 * El gate del archivo web de la newsletter, comprobado en sus dos pisos.
 *
 * La promesa "los suscriptores la reciben antes que nadie" se cumple por
 * construcción: `/newsletter` solo renderiza lo que pasa por `sentIssues`, y
 * `sent` se voltea a mano en la misma sesión que el envío real. Sin este test,
 * dos fallos silenciosos:
 *
 * 1. Un cambio en el filtro de la lib (o una página que la rodee) puede
 *    publicar una edición aprobada (`draft: false`) pero aún no enviada — hoy
 *    mismo `2026-08-geo-ep1` está en exactamente ese estado.
 * 2. El flip manual puede marcar `sent: true` en una edición que sigue en
 *    draft: archivable pero no enviable, un estado que no significa nada.
 *
 * Se importa `#site/content` directamente: el runner de Node resuelve el
 * `imports` del package.json, y CI corre `build:content` antes que `verify`,
 * así que la colección existe. El mismo orden es obligatorio en local.
 */

const DIR = join(import.meta.dirname, '..', 'content', 'newsletters');

function frontmatterDe(fichero: string): Record<string, string> {
  const bruto = readFileSync(join(DIR, fichero), 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(bruto);
  assert.ok(m, `${fichero} no tiene frontmatter`);
  const campos: Record<string, string> = {};
  for (const linea of m[1]!.split('\n')) {
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(linea.trim());
    if (kv) campos[kv[1]!] = kv[2]!.replace(/^["']|["']$/g, '').trim();
  }
  return campos;
}

describe('archivo web de la newsletter', () => {
  test('solo expone ediciones con sent: true', () => {
    for (const issue of sentIssues) {
      assert.equal(issue.sent, true, `${issue.issue} está en el archivo sin sent: true`);
    }
  });

  test('ninguna edición en draft aparece en el archivo', () => {
    const archivadas = new Set(sentIssues.map((i) => i.issue));
    for (const issue of newsletters) {
      if (issue.draft) {
        assert.ok(
          !archivadas.has(issue.issue),
          `${issue.issue} está en draft y a la vez en el archivo`,
        );
      }
    }
  });

  test('una edición aprobada pero no enviada no se filtra al archivo', () => {
    // El caso real de hoy: geo-ep1 tiene draft: false (aprobada para enviar)
    // y todavía no ha salido. Es exactamente la edición que el gate existe
    // para retener; si este test falla, el archivo está vendiendo por la
    // web lo que los suscriptores aún no han recibido.
    const aprobadasNoEnviadas = newsletters.filter((n) => !n.draft && !n.sent);
    const archivadas = new Set(sentIssues.map((i) => i.issue));
    for (const issue of aprobadasNoEnviadas) {
      assert.ok(
        !archivadas.has(issue.issue),
        `${issue.issue} está aprobada sin enviar y ya es pública`,
      );
    }
  });

  test('sent solo puede vivir en ediciones enviables (draft: false)', () => {
    for (const fichero of readdirSync(DIR)) {
      if (!fichero.endsWith('.md')) continue;
      const campos = frontmatterDe(fichero);
      if (campos.sent === 'true') {
        assert.equal(
          campos.draft,
          'false',
          `${fichero} declara sent: true pero sigue en draft`,
        );
      }
    }
  });

  test('las ediciones del archivo están ordenadas de nueva a antigua', () => {
    const fechas = sentIssues.map((i) => +new Date(i.date));
    const ordenadas = [...fechas].sort((a, b) => b - a);
    assert.deepEqual(fechas, ordenadas);
  });

  test('los permalinks del archivo son únicos', () => {
    const permalinks = sentIssues.map((i) => i.permalink);
    assert.equal(new Set(permalinks).size, permalinks.length);
  });
});
