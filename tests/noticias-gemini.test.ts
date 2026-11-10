import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TITULAR_MAX } from '../scripts/radar/edition-gate.mjs';
import {
  TITULAR_LIMIT,
  extractMdx,
  fechaLegible,
  redact,
  stampLeadFrontmatter,
  ensureSourceLink,
} from '../scripts/radar/write-with-gemini.mjs';
import { writerFailureReason } from '../scripts/radar/write-result.mjs';

const ROOT = join(import.meta.dirname, '..');

describe('escritura con Gemini', () => {
  test('el límite que se le pide al modelo cabe en el que se comprueba', () => {
    const workflow = readFileSync(join(ROOT, '.github/workflows/noticias-diarias.yml'), 'utf8');
    const script = readFileSync(join(ROOT, 'scripts/radar/write-with-gemini.mjs'), 'utf8');
    const pedidoWorkflow = Number(workflow.match(/in at most (\d+) characters/)?.[1]);
    assert.equal(TITULAR_LIMIT, 110);
    assert.equal(pedidoWorkflow, TITULAR_LIMIT);
    assert.match(script, new RegExp(`in at most \\$\\{TITULAR_LIMIT\\} characters`));
    assert.ok(TITULAR_LIMIT <= TITULAR_MAX, `se piden ${TITULAR_LIMIT} y se aceptan ${TITULAR_MAX}`);
  });

  test('el workflow escribe con Gemini y ya no usa Claude Code', () => {
    const workflow = readFileSync(join(ROOT, '.github/workflows/noticias-diarias.yml'), 'utf8');
    assert.match(workflow, /write-with-gemini\.mjs/);
    assert.match(workflow, /secrets\.GEMINI_API_KEY/);
    assert.doesNotMatch(workflow, /anthropics\/claude-code-action/);
    assert.doesNotMatch(workflow, /CLAUDE_CODE_OAUTH_TOKEN/);
  });

  test('fecha en español, sin depender del locale de la máquina', () => {
    assert.equal(fechaLegible('2026-11-10'), '10 de noviembre de 2026');
    assert.equal(fechaLegible('2026-10-30'), '30 de octubre de 2026');
  });

  test('extrae el MDX aunque el modelo lo envuelva en una valla', () => {
    const mdx = extractMdx('Claro, aquí va:\n```mdx\n---\ntitle: "Noticias — 10 de noviembre de 2026"\n---\n\nHola.\n```\n');
    assert.ok(mdx.startsWith('---\n'));
    assert.match(mdx, /title: "Noticias — 10 de noviembre de 2026"/);
    assert.ok(mdx.endsWith('\n'));
  });

  test('redacta la clave si un error la devuelve', () => {
    const clave = 'AQ.A-falso-no-usar-1234567890';
    assert.equal(redact(`invalid API key: ${clave}`, clave).includes(clave), false);
    assert.match(redact(`invalid API key: ${clave}`, clave), /\[redacted\]/);
  });

  test('sella la metadata de la fuente en el artículo protagonista', () => {
    const lead = {
      title: 'A "quoted" title',
      url: 'https://ejemplo.test/historia',
      source: 'The Decoder',
      publishedAt: '2026-11-09T08:00:00.000Z',
      textWords: 612,
    };
    const stamped = stampLeadFrontmatter(
      '---\ntitle: "Titular propio"\nrelevancia: ia\ndate: 1999-01-01\nprotagonista: true\n---\n\n## Qué pasó\n\nTexto.\n',
      lead,
      '2026-11-10',
    );
    assert.match(stamped, /date: 2026-11-10/);
    assert.match(stamped, /fuente_titulo: "A \\"quoted\\" title"/);
    assert.match(stamped, /fuente_url: https:\/\/ejemplo\.test\/historia/);
    assert.match(stamped, /fuente_medio: "The Decoder"/);
    assert.match(stamped, /fuente_fecha: 2026-11-09/);
    assert.match(stamped, /fuente_palabras: 612/);
    assert.match(stamped, /impacto_interactivo: true/);
    assert.match(stamped, /title: "Titular propio"/);
  });


  test('si el protagonista no enlaza la fuente, se añade la atribución', () => {
    const lead = { url: 'https://ejemplo.test/historia', outlet: 'The Verge', source: 'The Verge AI' };
    const sin = '---\ntitle: "T"\n---\n\n## Qué pasó\n\nPasó algo.\n';
    const con = ensureSourceLink(sin, lead);
    assert.match(con, /Según \[The Verge\]\(https:\/\/ejemplo\.test\/historia\)/);
    assert.equal(ensureSourceLink(con, lead), con, 'no lo duplica si ya está');
  });

  test('el motivo de un fallo se exporta; un resultado correcto no', () => {
    assert.equal(writerFailureReason({ ok: false, error: 'Gemini HTTP 429' }), 'Gemini HTTP 429');
    assert.equal(writerFailureReason({ ok: true, title: 'Noticias — 10 de noviembre de 2026' }), '');
    assert.equal(writerFailureReason(null), '');
  });
});
