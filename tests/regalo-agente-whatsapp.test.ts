import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sitemap from '@/app/sitemap';
import { REVISADO } from '@/config/revisiones';
import { REGALO_AGENTE_WHATSAPP } from '@/config/regalo-agente-whatsapp';

const root = fileURLToPath(new URL('..', import.meta.url));
const IRUN = /Irún|Irun/;
const NEXORA = /Nexora/;

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

const ficheros = [
  'src/config/regalo-agente-whatsapp.ts',
  'src/app/herramientas/agente-whatsapp/page.tsx',
  'src/components/herramientas/regalo-agente-whatsapp.tsx',
];

describe('el regalo del agente de WhatsApp', () => {
  test('no nombra Irún ni «Nexora» (estas páginas dicen NBI)', () => {
    for (const f of ficheros) {
      const texto = source(f);
      assert.doesNotMatch(texto, IRUN, f);
      assert.doesNotMatch(texto, NEXORA, f);
    }
  });

  test('el formulario reutiliza el alta existente, sin resource de Supabase', () => {
    const entrega = source('src/components/herramientas/regalo-agente-whatsapp.tsx');
    assert.match(entrega, /fetch\("\/api\/alta"/);
    assert.match(entrega, /source=\{REGALO_AGENTE_WHATSAPP\.source\}/);
    assert.doesNotMatch(entrega, /resource=/);
    assert.equal(REGALO_AGENTE_WHATSAPP.source, 'agente-whatsapp');
    assert.equal(REGALO_AGENTE_WHATSAPP.href, '/herramientas/agente-whatsapp');
  });

  test('está en el sitemap, en llms.txt y en la fecha de revisión', () => {
    const ruta = REGALO_AGENTE_WHATSAPP.href;
    assert.equal(REVISADO[ruta], '2026-11-16');
    assert.ok(
      sitemap().some((e) => e.url.endsWith(ruta) && String(e.lastModified) === '2026-11-16'),
      'la ruta no está en el sitemap con su fecha',
    );
    assert.match(source('src/app/llms.txt/route.ts'), /\/herramientas\/agente-whatsapp/);
    assert.match(source('src/app/herramientas/page.tsx'), /REGALO_AGENTE_WHATSAPP/);
  });
});
