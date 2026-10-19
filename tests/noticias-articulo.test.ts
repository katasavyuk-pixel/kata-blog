import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  NOT_A_LEAD_MESSAGE,
  articleErrors,
  freshLeadErrors,
  isLeadArticle,
  longestSharedRun,
  shingleOverlap,
} from '../scripts/radar/article-gate.mjs';
import { countWords, MIN_SOURCE_WORDS } from '../scripts/radar/source-text.mjs';
import { parseNovedades } from '@/lib/novedades';
import { MIN_SOURCE_WORDS as MIN_SOURCE_WORDS_TS } from '@/config/noticias';

/**
 * Metadatos, enlaces y originalidad del artículo protagonista.
 *
 * `articleErrors` es la misma función que corre en el workflow
 * (verify-article.mjs) y que decide si algo se publica; aquí se prueba con un
 * artículo válido y con una mutación por cada regla, para que ninguna regla
 * pueda dejar de morder sin que falle un test.
 */

const ROOT = join(import.meta.dirname, '..');
const URL_FUENTE = 'https://ejemplo.test/a';

const prose = (tag: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${tag} ${i} describe un efecto distinto sobre la plantilla y la caja de una pyme concreta.`).join(' ');

const sourceText = Array.from(
  { length: 40 },
  (_, i) => `El informe original ${i} detalla cifras de despliegue, calendarios y reservas del proveedor sin relación con lo escrito aquí.`,
).join(' ');

const candidate = {
  title: 'Company cuts jobs as AI agents take over support work',
  url: URL_FUENTE,
  source: 'OpenAI News',
  axis: 'ia',
  publishedAt: '2026-10-09T05:00:00.000Z',
  textWords: countWords(sourceText),
  textStatus: { sufficient: true, reason: 'ok' },
  text: sourceText,
};

function article(over: { frontmatter?: Record<string, string>; body?: string } = {}) {
  const fm: Record<string, string> = {
    title: '"Una empresa recorta empleos"',
    description: '"Qué pasó y por qué importa"',
    kicker: '"Noticia"',
    date: '2026-10-09',
    tema: 'contenido',
    formato: 'radar',
    seccion: 'radar',
    cover: '/covers/radar.webp',
    coverAlt: '"Vigía"',
    protagonista: 'true',
    relevancia: 'ia',
    fuente_titulo: `"${candidate.title}"`,
    fuente_url: URL_FUENTE,
    fuente_medio: '"OpenAI News"',
    fuente_fecha: '2026-10-09',
    fuente_palabras: String(candidate.textWords),
    draft: 'false',
    premium: 'false',
    ...over.frontmatter,
  };
  const yaml = Object.entries(fm)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  const body =
    over.body ??
    `## Qué pasó

Según [OpenAI News](${URL_FUENTE}), ${prose('alfa', 10)}

## Contexto

${prose('beta', 10)}

## Por qué importa

${prose('gamma', 10)}

## Qué falta por saber

${prose('delta', 8)}

## La pregunta

¿Qué tarea de tu negocio dejarías hoy en manos de un agente?
`;
  return `---\n${yaml}\n---\n\n${body}`;
}

const errores = (mdx: string) => articleErrors(mdx, { candidates: [candidate], sourceText });

describe('artículo protagonista: lo válido pasa', () => {
  test('un artículo completo y original no da errores', () => {
    assert.deepEqual(errores(article()), []);
  });

  test('se reconoce como protagonista solo con protagonista: true', () => {
    assert.equal(isLeadArticle(article()), true);
    assert.equal(isLeadArticle(article({ frontmatter: { protagonista: 'false' } })), false);
  });

  test('un artículo automático no declara relaciones con otras piezas, ni recién escrito ni después', () => {
    const conRelacion = article({ frontmatter: { se_resuelve_con: '\n  - calculadora-costes' } });
    assert.match(errores(conRelacion).join('\n'), /se_resuelve_con is for hand-written pieces/);
  });

  test('«revisado» lo pone una persona sobre lo ya publicado, nunca el sistema al escribir', () => {
    // Es lo que indexa la pieza y le quita la etiqueta de IA.
    const revisado = article({ frontmatter: { revisado: 'true' } });
    // Lo commiteado se comprueba sin la opción: una revisión posterior es legítima.
    assert.deepEqual(errores(revisado), []);
    // El workflow (verify-article.mjs) siempre la pasa.
    const delWorkflow = articleErrors(revisado, { candidates: [candidate], sourceText, requireUnreviewed: true });
    assert.equal(delWorkflow.length, 1);
    assert.match(delWorkflow[0], /revisado cannot be true/);
  });
});

describe('metadatos de la fuente', () => {
  test('una url que no está en las candidatas es una alucinación', () => {
    const mdx = article({ frontmatter: { fuente_url: 'https://inventada.test/x' } });
    assert.match(errores(mdx).join('\n'), /not in candidates/);
  });

  test('título, medio y fecha deben ser los de la candidata', () => {
    const joined = errores(
      article({ frontmatter: { fuente_titulo: '"Otro titular"', fuente_medio: '"Otro Medio"', fuente_fecha: '2026-10-01' } }),
    ).join('\n');
    assert.match(joined, /fuente_titulo altered/);
    assert.match(joined, /fuente_medio altered/);
    assert.match(joined, /fuente_fecha altered/);
  });

  test('las comillas tipográficas no cuentan como título alterado', () => {
    const mdx = article({ frontmatter: { fuente_titulo: `"Company's AI agents take over support work"` } });
    const typographic = { ...candidate, title: 'Company’s AI agents take over support work' };
    assert.deepEqual(articleErrors(mdx, { candidates: [typographic], sourceText }), []);
  });

  test('una fuente sin texto completo suficiente no admite artículo', () => {
    const insuficiente = { ...candidate, textStatus: { sufficient: false, reason: 'paywall' } };
    assert.match(articleErrors(article(), { candidates: [insuficiente], sourceText }).join('\n'), /no sufficient full text \(paywall\)/);
  });

  test('fuente_palabras por debajo del mínimo, o distinto de lo recolectado, falla', () => {
    assert.match(errores(article({ frontmatter: { fuente_palabras: '120' } })).join('\n'), /fuente_palabras must be a number >= 350/);
    assert.match(
      errores(article({ frontmatter: { fuente_palabras: String(candidate.textWords - 1) } })).join('\n'),
      /does not match the collected text/,
    );
  });

  test('si el recolector marca suficiente pero falta el texto fuente, el artículo se rechaza', () => {
    const sinTexto = { ...candidate, text: '' };
    assert.match(
      articleErrors(article(), { candidates: [sinTexto] }).join('\n'),
      /full source text is missing/,
    );
  });

  test('el texto real debe alcanzar el mínimo declarado por el recolector', () => {
    const corto = { ...candidate, text: 'Una fuente corta con apenas unas pocas palabras.' };
    assert.match(
      articleErrors(article(), { candidates: [corto] }).join('\n'),
      /fewer than 350 words/,
    );
  });

  test('faltan campos obligatorios', () => {
    const joined = errores(article({ frontmatter: { relevancia: 'deportes', fuente_medio: '', fuente_fecha: '' } })).join('\n');
    assert.match(joined, /relevancia must be one of/);
    assert.match(joined, /fuente_medio is required/);
    assert.match(joined, /fuente_fecha is required/);
  });

  test('la fuente debe ser https', () => {
    assert.match(errores(article({ frontmatter: { fuente_url: 'http://ejemplo.test/a' } })).join('\n'), /must be https/);
  });
});

describe('enlaces de fuentes', () => {
  test('el cuerpo debe enlazar la fuente verbatim', () => {
    const mdx = article({ body: article().split('---\n\n')[1].replace(`(${URL_FUENTE})`, '(https://ejemplo.test/a/)') });
    assert.match(errores(mdx).join('\n'), /must link the primary source/);
  });

  test('el cuerpo debe nombrar al medio', () => {
    const body = article().split('---\n\n')[1].replace('[OpenAI News]', '[la noticia]');
    assert.match(errores(article({ body })).join('\n'), /attribute the source by name/);
  });

  test('vale nombrar al medio como lo llama la gente, no solo con la etiqueta del feed', () => {
    // El 10-oct-2026 el artículo decía «The Guardian» y el gate exigía «The
    // Guardian AI», que es el nombre del feed: ese día no hubo edición.
    const delFeed = { ...candidate, source: 'The Guardian AI', outlet: 'The Guardian' };
    const body = article().split('---\n\n')[1].replace('[OpenAI News]', '[The Guardian]');
    const mdx = article({ body, frontmatter: { fuente_medio: '"The Guardian AI"' } });
    assert.deepEqual(articleErrors(mdx, { candidates: [delFeed], sourceText }), []);

    const sinNombre = article({ body: body.replace('[The Guardian]', '[el diario]'), frontmatter: { fuente_medio: '"The Guardian AI"' } });
    const errores = articleErrors(sinNombre, { candidates: [delFeed], sourceText });
    assert.deepEqual(errores, ['body must attribute the source by name (The Guardian AI or The Guardian)']);
  });

  test('sin candidatos, como se revisa lo commiteado, también vale el nombre del medio', () => {
    // El 14-oct-2026 la tubería publicó un artículo que decía «The Guardian» y el
    // test sobre lo commiteado, que no tiene candidatos, solo aceptaba «The
    // Guardian AI»: la CI de main quedó en rojo con un artículo correcto.
    const body = article().split('---\n\n')[1].replace('[OpenAI News]', '[The Guardian]');
    const mdx = article({ body, frontmatter: { fuente_medio: '"The Guardian AI"' } });
    assert.doesNotMatch(articleErrors(mdx).join('\n'), /attribute the source by name/);

    const sinNombre = article({ body: body.replace('[The Guardian]', '[el diario]'), frontmatter: { fuente_medio: '"The Guardian AI"' } });
    assert.match(articleErrors(sinNombre).join('\n'), /attribute the source by name \(The Guardian AI or The Guardian\)/);
  });

  test('un enlace externo que no viene de una fuente recolectada falla', () => {
    const body = `${article().split('---\n\n')[1]}\nMás en [otro sitio](https://otro.test/z).\n`;
    assert.match(errores(article({ body })).join('\n'), /not backed by a collected source/);
  });

  test('un enlace http (no https) falla', () => {
    const body = `${article().split('---\n\n')[1]}\nMás en [otro](http://ejemplo.test/a).\n`;
    assert.match(errores(article({ body })).join('\n'), /external link must be https/);
  });

  test('un enlace HTML externo no recolectado falla igual que uno Markdown', () => {
    const body = `${article().split('---\n\n')[1]}\n<a href="https://otro.test/z">otro sitio</a>\n`;
    assert.match(errores(article({ body })).join('\n'), /not backed by a collected source/);
  });

  test('un protocolo de enlace distinto de https se rechaza', () => {
    const body = `${article().split('---\n\n')[1]}\n[otro](javascript:alert(1))\n`;
    assert.match(errores(article({ body })).join('\n'), /external link must be https/);
  });

  test('un enlace de apoyo declarado y recolectado sí vale', () => {
    const apoyo = { ...candidate, url: 'https://ejemplo.test/b', text: undefined };
    const body = `${article().split('---\n\n')[1]}\nVéase también [esto](https://ejemplo.test/b).\n`;
    const mdx = article({ body, frontmatter: { fuentes_apoyo: '\n  - https://ejemplo.test/b' } });
    assert.deepEqual(articleErrors(mdx, { candidates: [candidate, apoyo], sourceText }), []);
  });
});

describe('estructura y longitud', () => {
  test('falta una sección', () => {
    const body = article().split('---\n\n')[1].replace('## Contexto', '## Antecedentes');
    assert.match(errores(article({ body })).join('\n'), /missing or out-of-order section: contexto/);
  });

  test('secciones fuera de orden', () => {
    const body = article().split('---\n\n')[1].replace('## Contexto', '## Zzz').replace('## Por qué importa', '## Contexto').replace('## Zzz', '## Por qué importa');
    assert.match(errores(article({ body })).join('\n'), /out-of-order section/);
  });

  test('el cierre debe ser una pregunta', () => {
    const body = article().split('---\n\n')[1].replace('¿Qué tarea de tu negocio dejarías hoy en manos de un agente?', 'Gracias por leer.');
    assert.match(errores(article({ body })).join('\n'), /must pose a question/);
  });

  test('un artículo corto no vale', () => {
    const body = `## Qué pasó\n\nSegún [OpenAI News](${URL_FUENTE}), poco.\n\n## Contexto\n\nNada.\n\n## Por qué importa\n\nPoco.\n\n## Qué falta por saber\n\nTodo.\n\n## La pregunta\n\n¿Y ahora?\n`;
    assert.match(errores(article({ body })).join('\n'), /article too short/);
  });
});

describe('originalidad respecto a la fuente', () => {
  test('copiar una tirada larga de la fuente falla', () => {
    const copied = sourceText.split(' ').slice(0, 40).join(' ');
    const body = article().split('---\n\n')[1].replace('## Contexto\n\n', `## Contexto\n\n${copied} `);
    const joined = errores(article({ body })).join('\n');
    assert.match(joined, /copies \d+ consecutive words/);
  });

  test('longestSharedRun y shingleOverlap miden lo esperado', () => {
    const a = 'uno dos tres cuatro cinco seis siete ocho nueve diez'.split(' ');
    const b = 'x uno dos tres cuatro cinco y seis siete ocho nueve diez z'.split(' ');
    assert.equal(longestSharedRun(a, b), 5);
    assert.equal(shingleOverlap('a b c d e f g h i j', 'a b c d e f g h i j'), 1);
    assert.equal(shingleOverlap('a b c d e f g h i j', 'k l m n o p q r s t'), 0);
  });

  test('usa el texto de la candidata para originalidad aunque no se pase aparte', () => {
    assert.deepEqual(articleErrors(article(), { candidates: [candidate] }), []);
  });
});

describe('recién escrito: lo que el workflow exige, y qué pasa si no lo cumple', () => {
  const EXPLORADOR = `<Comparador etiqueta="Perspectiva empresarial de la noticia" modo="explorar">
  <Lado titulo="Dirección">
    ${prose('dirección', 3)}
  </Lado>
  <Lado titulo="Operaciones">
    ${prose('operaciones', 3)}
  </Lado>
  <Lado titulo="Tecnología">
    ${prose('tecnología', 3)}
  </Lado>
</Comparador>`;
  const reciente = (over: Parameters<typeof article>[0] = {}) => {
    const body = (over.body ?? article().split('---\n\n')[1]).replace('## Qué falta por saber', `${EXPLORADOR}\n\n## Qué falta por saber`);
    return article({ body, frontmatter: { impacto_interactivo: 'true', ...over.frontmatter } });
  };

  test('un artículo recién escrito y completo pasa; sin el explorador, no', () => {
    assert.deepEqual(freshLeadErrors(reciente(), [candidate]), []);
    assert.match(freshLeadErrors(article(), [candidate]).join('\n'), /impacto_interactivo: true/);
  });

  test('lo que no es un artículo protagonista se rechaza con su mensaje', () => {
    assert.deepEqual(freshLeadErrors(article({ frontmatter: { protagonista: 'false' } }), [candidate]), [NOT_A_LEAD_MESSAGE]);
  });

  // settle-lead.mjs tal como lo lanza el workflow: nunca tumba el día.
  const SETTLE = join(ROOT, 'scripts', 'radar', 'settle-lead.mjs');
  const VERIFY = join(ROOT, 'scripts', 'radar', 'verify-article.mjs');
  const seleccion = { status: 'lead', lead: candidate, themes: ['ia'] };

  function caso(mdx: string | null, lead: object = seleccion) {
    const dir = mkdtempSync(join(tmpdir(), 'protagonista-'));
    const candidatos = join(dir, 'radar-candidates.json');
    const leadPath = join(dir, 'lead.json');
    const articulo = join(dir, 'noticia-2026-10-09.mdx');
    const salida = join(dir, 'github-output');
    writeFileSync(candidatos, JSON.stringify({ items: [candidate] }));
    writeFileSync(leadPath, JSON.stringify(lead));
    writeFileSync(salida, '');
    if (mdx !== null) writeFileSync(articulo, mdx);
    const env = { ...process.env, RADAR_CANDIDATES_PATH: candidatos, RADAR_LEAD_PATH: leadPath, GITHUB_OUTPUT: salida };
    const lanzar = (script: string, ...args: string[]) =>
      spawnSync(process.execPath, [script, articulo, ...args], { cwd: ROOT, env, encoding: 'utf8' });
    return {
      articulo,
      lanzar,
      lead: () => JSON.parse(readFileSync(leadPath, 'utf8')),
      salida: () => readFileSync(salida, 'utf8'),
    };
  }

  test('un artículo que pasa se queda', () => {
    const c = caso(reciente());
    const r = c.lanzar(SETTLE);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /ok — lead article verified/);
    assert.equal(existsSync(c.articulo), true);
    assert.equal(c.lead().status, 'lead');
    assert.equal(c.salida(), 'lead=kept\n');
  });

  test('un artículo que no pasa se retira, y el día sigue con la edición breve', () => {
    const malo = reciente({ frontmatter: { fuente_titulo: '"Otro titular"' } });
    const c = caso(malo);

    // El gate estricto sigue dando 1 sobre ese mismo fichero.
    const estricto = c.lanzar(VERIFY);
    assert.equal(estricto.status, 1);
    assert.match(estricto.stderr, /ARTICLE VERIFICATION FAILED \(1 problems\)/);

    const r = c.lanzar(SETTLE);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(existsSync(c.articulo), false, 'el artículo malo no puede quedar para publicarse');
    assert.match(r.stdout, /::warning title=Lead article dropped::1 problem\(s\): fuente_titulo altered/);
    // La edición lee lead.json para saber qué historia saltarse: ya ninguna.
    const lead = c.lead();
    assert.equal(lead.status, 'insufficient');
    assert.equal(lead.dropped.url, URL_FUENTE);
    assert.equal(lead.dropped.problems.length, 1);
    assert.equal(lead.lead, undefined, 'el texto de la fuente no se queda en un día sin artículo');
    assert.equal(c.salida(), 'lead=dropped\n');
  });

  test('si el paso de escritura no dejó fichero, también sigue', () => {
    const c = caso(null);
    const r = c.lanzar(SETTLE);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(c.lead().dropped.problems, ['the writing step left no article']);
    assert.equal(c.salida(), 'lead=dropped\n');
  });

  test('--drop retira un artículo válido cuando lo pide la build de contenido', () => {
    const c = caso(reciente());
    const r = c.lanzar(SETTLE, '--drop', 'the content build failed with it in place');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(existsSync(c.articulo), false);
    assert.deepEqual(c.lead().dropped.problems, ['the content build failed with it in place']);
  });

  test('un día sin protagonista elegida no toca nada', () => {
    const c = caso(null, { status: 'insufficient', reason: 'no eligible source', considered: 3 });
    const r = c.lanzar(SETTLE);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(c.lead().reason, 'no eligible source');
    assert.equal(c.salida(), 'lead=none\n');
  });

  test('una llamada mal escrita no se interpreta: sale con 1', () => {
    assert.equal(caso(reciente()).lanzar(SETTLE, '--drop').status, 1);
    assert.equal(caso(reciente()).lanzar(SETTLE, '--otra', 'cosa').status, 1);
  });
});

describe('lo publicado y la configuración', () => {
  test('el mínimo de palabras de la fuente es el mismo en build y en pipeline', () => {
    assert.equal(MIN_SOURCE_WORDS_TS, MIN_SOURCE_WORDS);
  });

  test('todo artículo protagonista commiteado pasa el gate estático', () => {
    const dir = join(ROOT, 'content', 'posts');
    for (const file of readdirSync(dir).filter((f) => /^noticia-\d{4}-\d{2}-\d{2}\.mdx$/.test(f))) {
      const mdx = readFileSync(join(dir, file), 'utf8');
      assert.equal(isLeadArticle(mdx), true, `${file} debe llevar protagonista: true`);
      assert.deepEqual(articleErrors(mdx), [], file);
    }
  });

  test('las ediciones no son artículos protagonistas', () => {
    const dir = join(ROOT, 'content', 'posts');
    for (const file of readdirSync(dir).filter((f) => /^(noticias|radar)-\d{4}/.test(f))) {
      assert.equal(isLeadArticle(readFileSync(join(dir, file), 'utf8')), false, file);
    }
  });
});

describe('novedades breves de la edición', () => {
  const edition = readFileSync(join(ROOT, 'content', 'posts', 'noticias-2026-10-08.mdx'), 'utf8');

  test('se leen los RadarItem de una edición real, con su primera frase', () => {
    const novedades = parseNovedades(edition);
    assert.equal(novedades.length, 7);
    assert.match(novedades[0].url, /^https:\/\//);
    assert.ok(novedades[0].resumen.endsWith('.'));
    assert.ok(!novedades[0].resumen.includes('\n'));
  });

  test('solo se admiten enlaces https', () => {
    const mdx = '<RadarItem title="t" source="s" url="javascript:alert(1)" date="2026-10-08" axis="ia">\n\nTexto. Más.\n\n</RadarItem>';
    assert.deepEqual(parseNovedades(mdx), []);
  });

  test('la fuente protagonista no se repite entre las novedades breves', () => {
    const all = parseNovedades(edition);
    const novedades = parseNovedades(edition, all[0].url);
    assert.equal(novedades.length, 6);
    assert.ok(novedades.every((item) => item.url !== all[0].url));
  });
});
