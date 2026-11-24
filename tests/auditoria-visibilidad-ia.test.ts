import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PUENTE_POR_POST } from '@/config/puentes';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const slug = 'auditoria-de-visibilidad-en-ia';
const resource = 'auditoria-visibilidad-ia';
const zipRoot = join(root, 'lead-magnets/auditoria-visibilidad-ia/zip');

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe('integración de la auditoría de visibilidad en IA', () => {
  test('el artículo declara el recurso, la portada existente y su puente', () => {
    const article = read(`content/posts/${slug}.mdx`);
    assert.match(article, /^recurso: auditoria-visibilidad-ia$/m);
    assert.match(article, /^cover: \/covers\/auditoria-de-visibilidad-en-ia\.webp$/m);
    const coverAlt = article.match(/^coverAlt: "([^"]+)"$/m)?.[1];
    assert.ok(coverAlt && coverAlt.length <= 180, 'coverAlt debe describir la foto en 180 caracteres como máximo.');
    assert.ok(existsSync(join(root, 'public/covers/auditoria-de-visibilidad-en-ia.webp')));
    assert.equal(PUENTE_POR_POST[slug], 'medir');
  });

  test('el seed enlaza el recurso con la ruta de almacenamiento acordada', () => {
    const seed = read('supabase/seeds/resources.sql');
    const block = seed.match(/insert into public\.resources[\s\S]*?on conflict \(slug\) do update set[\s\S]*?;/g)
      ?.find((candidate) => candidate.includes(`'${resource}'`));
    assert.ok(block, `No existe el bloque seed para ${resource}.`);
    assert.match(block, /'auditoria-visibilidad-ia\/auditoria-visibilidad-ia\.zip'/);
    assert.match(block, /'Auditoría de visibilidad en IA: la skill para medir si te recomiendan'/);
    assert.match(block, /true,\s*true/);
  });

  test('cada archivo listado en «Qué contiene el zip» existe dentro del zip', () => {
    const readme = read('lead-magnets/auditoria-visibilidad-ia/README.md');
    const section = readme.split('## Qué contiene el zip')[1]?.split(/^## /m)[0] ?? '';
    const listed = [...section.matchAll(/`((?:SKILL\.md|references\/[^`]+|assets\/[^`]+|scripts\/[^`]+|ejemplos\/[^`]+))`/g)]
      .map((match) => match[1]);
    assert.ok(listed.length > 0, 'No se encontraron archivos listados en la sección del zip.');
    for (const file of ['LEEME.txt', ...listed]) {
      assert.ok(existsSync(join(zipRoot, file.startsWith('LEEME') ? file : `auditoria-visibilidad-ia/${file}`)), `${file} no está en zip/.`);
    }
  });

  test('el contenido del zip y el artículo respetan las prohibiciones editoriales', () => {
    const article = read(`content/posts/${slug}.mdx`);
    const content = [...filesUnder(zipRoot).map((path) => readFileSync(path, 'utf8')), article].join('\n');
    assert.doesNotMatch(content, /irún/i);
    assert.doesNotMatch(content, /\bNexora(?! Business Intelligence)\b/i);
    assert.doesNotMatch(content, /\d+\s?€|€\s?\d/);
  });

  test('la skill declara el nombre y versión requeridos', () => {
    const skill = read('lead-magnets/auditoria-visibilidad-ia/zip/auditoria-visibilidad-ia/SKILL.md');
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, 'SKILL.md no tiene frontmatter YAML.');
    assert.match(frontmatter[1], /^name: auditoria-visibilidad-ia$/m);
    assert.match(frontmatter[1], /^  version: ["']?1\.0\.0["']?$/m);
  });

  test('el script de puntuación solo importa módulos permitidos de la biblioteca estándar', () => {
    const script = read('lead-magnets/auditoria-visibilidad-ia/zip/auditoria-visibilidad-ia/scripts/puntuar.py');
    const imports = [...script.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm)]
      .map((match) => (match[1] ?? match[2]).split('.')[0]);
    const allowed = new Set(['argparse', 'csv', 'json', 're', 'sys', 'collections', 'datetime', 'pathlib']);
    assert.ok(imports.length > 0);
    assert.deepEqual(imports.filter((name) => !allowed.has(name)), []);
    assert.doesNotMatch(script, /\b(?:socket|urllib|http|subprocess|requests)\b/);
  });

  test('el CSV y el informe de ejemplo identifican los datos como inventados', () => {
    const csv = read('lead-magnets/auditoria-visibilidad-ia/zip/auditoria-visibilidad-ia/ejemplos/registro-ejemplo.csv');
    const report = read('lead-magnets/auditoria-visibilidad-ia/zip/auditoria-visibilidad-ia/ejemplos/informe-ejemplo.md');
    assert.match(csv, /datos de ejemplo|inventad/i);
    assert.match(report, /ejemplo|inventad/i);
  });
});
