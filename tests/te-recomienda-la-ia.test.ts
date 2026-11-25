import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PUENTE_POR_POST } from '@/config/puentes';
import { getActivo } from '@/lib/catalogo';
import { LOGOS_DE_SKILL } from '@/config/logos';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const slug = 'te-recomienda-la-ia';
const resource = 'te-recomienda-la-ia';
const zipRoot = join(root, 'lead-magnets/te-recomienda-la-ia/zip');

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe('integración de la medición mensual de recomendaciones en IA', () => {
  test('el artículo declara el recurso, la portada existente y su puente', () => {
    const article = read(`content/posts/${slug}.mdx`);
    assert.match(article, /^recurso: te-recomienda-la-ia$/m);
    assert.match(article, /^cover: \/covers\/te-recomienda-la-ia\.webp$/m);
    const coverAlt = article.match(/^coverAlt: "([^"]+)"$/m)?.[1];
    assert.ok(coverAlt && coverAlt.length <= 180, 'coverAlt debe describir la foto en 180 caracteres como máximo.');
    assert.ok(existsSync(join(root, 'public/covers/te-recomienda-la-ia.webp')));
    assert.equal(PUENTE_POR_POST[slug], 'medir');
    assert.match(article, /^title: "¿Te recomienda la IA\? Mide cada mes si ChatGPT, Gemini y Perplexity te nombran"$/m);
    assert.doesNotMatch(article.match(/^title:.*$/m)?.[0] ?? '', /auditoría/i);
    assert.match(article, /## 🔀 Dos preguntas distintas/);
    for (const row of [
      '| Qué mira | Tu web: si responde, si los rastreadores entran, datos estructurados… | Lo que contestan ChatGPT, Gemini y Perplexity a 9 preguntas de cliente. |',
      '| Con qué | Skill gratis [Visibilidad en IA](/marketplace/visibilidad-en-ia). | Esta skill. |',
      '| Cuándo | Antes y después de tocar la web. | Una vez al mes. |',
      '| Qué te da | Una hoja con 9 comprobaciones. | Una nota de 0 a 100 y cómo cambia. |',
    ]) assert.ok(article.includes(row), `Falta fila de comparación: ${row}`);
    assert.match(article, /Primero que pueda leerte; luego, medir si te nombra\./);
    assert.match(article, /utm_campaign=te-recomienda-la-ia/);
  });

  test('el seed enlaza el recurso con la ruta de almacenamiento acordada', () => {
    const seed = read('supabase/seeds/resources.sql');
    const block = seed.match(/insert into public\.resources[\s\S]*?on conflict \(slug\) do update set[\s\S]*?;/g)
      ?.find((candidate) => candidate.includes(`'${resource}'`));
    assert.ok(block, `No existe el bloque seed para ${resource}.`);
    assert.match(block, /'te-recomienda-la-ia\/te-recomienda-la-ia\.zip'/);
    assert.match(block, /'¿Te recomienda la IA\? La skill para medir cada mes si te nombran'/);
    assert.match(block, /true,\s*true/);
  });

  test('cada archivo listado en «Qué contiene el zip» existe dentro del zip', () => {
    const readme = read('lead-magnets/te-recomienda-la-ia/README.md');
    const section = readme.split('## 📦 Qué contiene el zip')[1]?.split(/^## /m)[0] ?? '';
    const listed = [...section.matchAll(/`((?:SKILL\.md|references\/[^`]+|assets\/[^`]+|scripts\/[^`]+|ejemplos\/[^`]+))`/g)]
      .map((match) => match[1]);
    assert.ok(listed.length > 0, 'No se encontraron archivos listados en la sección del zip.');
    for (const file of ['LEEME.txt', ...listed]) {
      assert.ok(existsSync(join(zipRoot, file.startsWith('LEEME') ? file : `te-recomienda-la-ia/${file}`)), `${file} no está en zip/.`);
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
    const skill = read('lead-magnets/te-recomienda-la-ia/zip/te-recomienda-la-ia/SKILL.md');
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, 'SKILL.md no tiene frontmatter YAML.');
    assert.match(frontmatter[1], /^name: te-recomienda-la-ia$/m);
    assert.doesNotMatch(skill.match(/^# .*$/m)?.[0] ?? '', /auditoría/i);
    assert.match(frontmatter[1], /^  version: ["']?1\.0\.0["']?$/m);
  });

  test('el script de puntuación solo importa módulos permitidos de la biblioteca estándar', () => {
    const script = read('lead-magnets/te-recomienda-la-ia/zip/te-recomienda-la-ia/scripts/puntuar.py');
    const imports = [...script.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm)]
      .map((match) => (match[1] ?? match[2]).split('.')[0]);
    const allowed = new Set(['argparse', 'csv', 'io', 'json', 're', 'sys', 'collections', 'datetime', 'pathlib']);
    assert.ok(imports.length > 0);
    assert.deepEqual(imports.filter((name) => !allowed.has(name)), []);
    assert.doesNotMatch(script, /\b(?:socket|urllib|http|subprocess|requests)\b/);
  });

  test('el CSV y el informe de ejemplo identifican los datos como inventados', () => {
    const csv = read('lead-magnets/te-recomienda-la-ia/zip/te-recomienda-la-ia/ejemplos/registro-ejemplo.csv');
    const report = read('lead-magnets/te-recomienda-la-ia/zip/te-recomienda-la-ia/ejemplos/informe-ejemplo.md');
    assert.match(csv, /datos de ejemplo|inventad/i);
    assert.match(report, /ejemplo|inventad/i);
  });

  test('está en el marketplace, con logo, descarga por correo y enlace al artículo', () => {
    const item = getActivo(slug);
    assert.ok(item, 'no está en ACTIVOS.');
    assert.equal(item.title, '¿Te recomienda la IA?');
    assert.equal(item.href, `/marketplace/${slug}`);
    assert.equal(item.descarga?.slug, resource);
    assert.equal(item.descarga?.articulo, `/blog/${slug}`);
    assert.ok(LOGOS_DE_SKILL[slug], 'no tiene logo.');
    assert.equal(LOGOS_DE_SKILL[slug].foto, undefined);
    const ficha = read('src/app/marketplace/[id]/page.tsx');
    assert.match(ficha, /resource=\{item\.descarga\.slug\}/);
    assert.match(ficha, /href=\{item\.descarga\.articulo\}/);
    const listado = read('src/app/marketplace/page.tsx');
    assert.match(listado, /LogoSkill/);
    assert.doesNotMatch(listado + ficha + (item.queHace + item.activo.paraQuien + item.activo.noEsPara + item.activo.pruebas), /irún/i);
    assert.doesNotMatch(item.queHace + item.activo.paraQuien + item.activo.noEsPara, /\bNexora(?! Business Intelligence)\b/i);
  });
});
