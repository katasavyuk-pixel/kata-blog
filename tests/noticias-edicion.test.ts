import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  NO_ITEMS_MESSAGE,
  TITULAR_MAX,
  canonical,
  decodeAttribute,
  editionErrors,
  encodeAttribute,
  parseRadarItems,
  repairRadarItems,
  titularProblems,
} from '../scripts/radar/edition-gate.mjs';
import { parseNovedades } from '@/lib/novedades';

/**
 * El gate anti-alucinación de la edición diaria.
 *
 * CLAUDE.md pide que, al tocar verify-edition.mjs, tres negativos sigan dando
 * exit 1: un titular reescrito, una url inventada y una fuente cambiada. Hasta
 * ahora eso se comprobaba a mano. Aquí se prueba dos veces: sobre la función
 * que decide (`editionErrors`, la misma que corre en el workflow) y sobre el
 * script tal como lo lanza el workflow, con su código de salida.
 */

const ROOT = join(import.meta.dirname, '..');
const VERIFY = join(ROOT, 'scripts/radar/verify-edition.mjs');
const REPAIR = join(ROOT, 'scripts/radar/repair-edition.mjs');

// Comillas tipográficas escritas como escapes: este test compara caracteres
// exactos, y uno invisible o casi igual no se puede revisar a ojo.
const TITULAR_CHIP = 'Microsoft’s new AI chip makes it less reliant on Nvidia’s GPUs';
const TITULAR_RONDA = 'Former exec raises $26M for an app that listens in the background';

const CANDIDATOS = [
  {
    title: TITULAR_CHIP,
    url: 'https://ejemplo.test/chip',
    source: 'The Verge AI',
    axis: 'negocio',
    publishedAt: '2026-10-12T08:00:00.000Z',
  },
  {
    title: TITULAR_RONDA,
    url: 'https://ejemplo.test/ronda',
    source: 'TechCrunch AI',
    axis: 'negocio',
    publishedAt: '2026-10-11T08:00:00.000Z',
  },
];

type Item = { title: string; source: string; url: string; date: string; axis: string; extra?: string };

const CHIP: Item = {
  title: TITULAR_CHIP,
  source: 'The Verge AI',
  url: 'https://ejemplo.test/chip',
  date: '2026-10-12',
  axis: 'negocio',
};
const RONDA: Item = {
  title: TITULAR_RONDA,
  source: 'TechCrunch AI',
  url: 'https://ejemplo.test/ronda',
  date: '2026-10-11',
  axis: 'negocio',
};

const item = (a: Item) =>
  [
    '<RadarItem',
    ...(a.extra ? [`  ${a.extra}`] : []),
    `  title="${a.title}"`,
    `  source="${a.source}"`,
    `  url="${a.url}"`,
    `  date="${a.date}"`,
    `  axis="${a.axis}"`,
    '>',
    '',
    'Qué pasó y por qué importa, en dos frases.',
    '',
    '</RadarItem>',
  ].join('\n');

function edicion(items: Item[], frontmatter: Record<string, string> = {}): string {
  const fm: Record<string, string> = {
    title: '"Noticias — 12 de octubre de 2026"',
    description: '"Lo que cambió hoy."',
    date: '2026-10-12',
    tema: 'contenido',
    formato: 'radar',
    seccion: 'radar',
    cover: '/covers/radar.webp',
    coverAlt: '"Vigía observa el horizonte."',
    draft: 'false',
    premium: 'false',
    ...frontmatter,
  };
  const yaml = Object.entries(fm).map(([key, value]) => `${key}: ${value}`).join('\n');
  return `---\n${yaml}\n---\n\n${items.map(item).join('\n\n')}\n`;
}

const NEGATIVOS: [string, Item, RegExp][] = [
  ['un titular reescrito', { ...CHIP, title: 'Microsoft presenta un chip que la libera de Nvidia' }, /title altered/],
  ['una url inventada', { ...CHIP, url: 'https://ejemplo.test/inventada' }, /URL not in candidates/],
  ['una fuente cambiada', { ...CHIP, source: 'TechCrunch AI' }, /source altered/],
];

describe('gate de la edición: los ítems contra los candidatos', () => {
  test('una edición fiel a lo recolectado pasa', () => {
    assert.deepEqual(editionErrors(edicion([CHIP, RONDA]), CANDIDATOS), []);
  });

  for (const [nombre, alterado, mensaje] of NEGATIVOS) {
    test(`${nombre} no pasa`, () => {
      const errores = editionErrors(edicion([alterado, RONDA]), CANDIDATOS);
      assert.equal(errores.length, 1, errores.join('\n'));
      assert.match(errores[0], mensaje);
    });
  }

  test('un eje cambiado no pasa', () => {
    const errores = editionErrors(edicion([{ ...CHIP, axis: 'geopolitica' }]), CANDIDATOS);
    assert.equal(errores.length, 1);
    assert.match(errores[0], /axis altered/);
  });

  test('una comilla tipográfica aplanada no es un titular alterado', () => {
    const aplanado = TITULAR_CHIP.replaceAll('’', "'");
    assert.notEqual(aplanado, TITULAR_CHIP);
    assert.equal(canonical(aplanado), canonical(TITULAR_CHIP));
    assert.deepEqual(editionErrors(edicion([{ ...CHIP, title: aplanado }]), CANDIDATOS), []);
  });

  test('la url no se pliega: es la clave de identidad', () => {
    const errores = editionErrors(edicion([{ ...CHIP, url: 'https://ejemplo.test/chip/' }]), CANDIDATOS);
    assert.match(errores[0], /URL not in candidates/);
  });

  test('una edición sin ítems no pasa por vacía', () => {
    assert.deepEqual(editionErrors(edicion([]), CANDIDATOS), [NO_ITEMS_MESSAGE]);
  });

  test('el frontmatter se comprueba aparte y no tapa un ítem alterado', () => {
    const soloFrontmatter = editionErrors(edicion([CHIP], { seccion: 'ideas' }), CANDIDATOS);
    assert.deepEqual(soloFrontmatter, ['frontmatter seccion must be "radar"']);

    const ambos = editionErrors(edicion([{ ...CHIP, source: 'Otro medio' }], { seccion: 'ideas' }), CANDIDATOS);
    assert.equal(ambos.length, 2);
    assert.match(ambos[0], /source altered/);
  });

  test('una edición recién escrita no puede declararse revisada', () => {
    // «revisado» indexa la pieza y cambia su aviso de IA: solo lo pone una persona.
    const errores = editionErrors(edicion([CHIP], { revisado: 'true' }), CANDIDATOS);
    assert.equal(errores.length, 1);
    assert.match(errores[0], /revisado cannot be true/);
  });

  test('una edición no declara relaciones con otras piezas: eso lo decide quien escribe a mano', () => {
    const errores = editionErrors(edicion([CHIP], { a_raiz_de: '\n  - que-es-rag' }), CANDIDATOS);
    assert.equal(errores.length, 1);
    assert.match(errores[0], /a_raiz_de is for hand-written pieces/);
    assert.match(editionErrors(edicion([CHIP], { se_resuelve_con: '\n  - calculadora-costes' }), CANDIDATOS)[0], /se_resuelve_con/);
  });

  test('un atributo que solo acaba igual no responde por otro', () => {
    const [leido] = parseRadarItems(edicion([{ ...CHIP, extra: 'data-title="Otro titular"' }]));
    assert.equal(leido.title, TITULAR_CHIP);
  });
});

describe('gate de la edición: tal como lo lanza el workflow', () => {
  const dir = mkdtempSync(join(tmpdir(), 'edicion-'));
  const candidatos = join(dir, 'radar-candidates.json');
  writeFileSync(candidatos, JSON.stringify({ items: CANDIDATOS }));

  const lanzar = (script: string, nombre: string, mdx: string) => {
    const fichero = join(dir, nombre);
    writeFileSync(fichero, mdx);
    const resultado = spawnSync(process.execPath, [script, fichero], {
      cwd: ROOT,
      env: { ...process.env, RADAR_CANDIDATES_PATH: candidatos },
      encoding: 'utf8',
    });
    return { ...resultado, fichero };
  };

  test('la edición fiel sale con 0', () => {
    const resultado = lanzar(VERIFY, 'fiel.mdx', edicion([CHIP, RONDA]));
    assert.equal(resultado.status, 0, resultado.stderr);
    assert.match(resultado.stdout, /ok — 2 items verified/);
  });

  NEGATIVOS.forEach(([nombre, alterado, mensaje], i) => {
    test(`${nombre} sale con 1`, () => {
      const resultado = lanzar(VERIFY, `negativo-${i}.mdx`, edicion([alterado, RONDA]));
      assert.equal(resultado.status, 1);
      assert.match(resultado.stderr, /VERIFICATION FAILED \(1 problems\)/);
      assert.match(resultado.stderr, mensaje);
    });
  });

  test('una edición sin ítems sale con 1', () => {
    const resultado = lanzar(VERIFY, 'vacia.mdx', edicion([]));
    assert.equal(resultado.status, 1);
    assert.match(resultado.stderr, /No <RadarItem> found/);
  });

  test('la reparación deja pasar al gate un titular reescrito, pero no una url inventada', () => {
    const reescrito = lanzar(REPAIR, 'reparable.mdx', edicion([{ ...CHIP, title: 'Otro titular' }, RONDA]));
    assert.equal(reescrito.status, 0, reescrito.stderr);
    assert.deepEqual(editionErrors(readFileSync(reescrito.fichero, 'utf8'), CANDIDATOS), []);

    const original = edicion([{ ...CHIP, url: 'https://ejemplo.test/inventada' }]);
    const inventada = lanzar(REPAIR, 'irreparable.mdx', original);
    assert.equal(inventada.status, 1);
    assert.match(inventada.stderr, /REPAIR ABORTED \(1 item\(s\)/);
    assert.equal(readFileSync(inventada.fichero, 'utf8'), original, 'una edición irreparable no se reescribe');
  });

  test('si el paso de escritura no dejó fichero, la reparación lo dice en una línea', () => {
    const resultado = spawnSync(process.execPath, [REPAIR, join(dir, 'no-existe.mdx')], {
      cwd: ROOT,
      env: { ...process.env, RADAR_CANDIDATES_PATH: candidatos },
      encoding: 'utf8',
    });
    assert.equal(resultado.status, 1);
    assert.match(resultado.stderr, /^NO EDITION TO REPAIR: the writing step left no file at .*no-existe\.mdx\.\n$/);
  });

  test('la reparación devuelve «revisado» a false antes de que llegue al gate', () => {
    const resultado = lanzar(REPAIR, 'revisada.mdx', edicion([CHIP], { revisado: 'true' }));
    assert.equal(resultado.status, 0, resultado.stderr);
    assert.match(resultado.stdout, /revisado reset to false/);
    const reparada = readFileSync(resultado.fichero, 'utf8');
    assert.match(reparada, /^revisado: false$/m);
    assert.deepEqual(editionErrors(reparada, CANDIDATOS), []);
  });
});

describe('reparación de los atributos', () => {
  test('devuelve titular, fuente, eje y fecha a los del candidato', () => {
    const { mdx, repaired, unmatched } = repairRadarItems(
      edicion([{ ...CHIP, title: 'Titular retocado', source: 'Verge', axis: 'ia', date: '2026-01-01' }, RONDA]),
      CANDIDATOS,
    );
    assert.deepEqual(unmatched, []);
    assert.equal(repaired, 1);
    assert.deepEqual(parseRadarItems(mdx)[0], CHIP);
  });

  test('un titular con «$» se escribe tal cual', () => {
    // «$$» y «$&» son patrones de sustitución de String.replace: escritos como
    // cadena, el primero pierde un símbolo y el segundo pega el atributo viejo.
    const titular = 'Why AI startups burn $$$ on inference & what $& means';
    const candidato = { ...CANDIDATOS[1], title: titular };
    const { mdx } = repairRadarItems(edicion([{ ...RONDA, title: 'Una ronda' }]), [candidato]);
    assert.equal(parseRadarItems(mdx)[0].title, titular);
  });

  test('una url que no está en los candidatos se señala y sus atributos no se tocan', () => {
    const inventado = { ...CHIP, url: 'https://ejemplo.test/inventada' };
    const { mdx, unmatched } = repairRadarItems(edicion([inventado, RONDA]), CANDIDATOS);
    assert.deepEqual(unmatched, ['https://ejemplo.test/inventada']);
    assert.deepEqual(parseRadarItems(mdx), [inventado, RONDA]);
  });
});

describe('titulares que rompen una etiqueta', () => {
  // El 13-oct-2026, 10 de los 79 candidatos traían comillas dobles en el
  // titular (los de Eurostat: `AVIA_TF_ACA - "Dataset: updated data"`). Escrito
  // tal cual dentro de title="…", el atributo acaba en la primera comilla: ni el
  // gate ni la página leen el ítem y MDX no compila.
  const COMILLAS = 'AVIA_TF_ACA - "Dataset: updated data"';
  const DE_TODO = 'Q&A: is "open" > closed? <b>No</b> &quot;literal&quot; {x} $& done';
  const candidato = (title: string, url = 'https://ejemplo.test/raro?a=1&b=2') => ({
    title,
    url,
    source: 'Eurostat "Statistics" Updates',
    axis: 'economia',
    publishedAt: '2026-10-13T06:00:00.000Z',
  });
  const soloUrl = (url: string) => `<RadarItem url="${url}">\n\nQué pasó y por qué importa.\n\n</RadarItem>`;

  test('codificar y descodificar es un viaje de ida y vuelta', () => {
    for (const texto of [COMILLAS, DE_TODO, 'sin nada raro', '&amp; ya escrito así en la fuente']) {
      assert.equal(decodeAttribute(encodeAttribute(texto)), texto);
      assert.doesNotMatch(encodeAttribute(texto), /["<>]/);
    }
  });

  test('con solo la url, la reparación escribe el resto desde el candidato', () => {
    const c = candidato(COMILLAS);
    const { mdx, repaired, unmatched } = repairRadarItems(soloUrl('https://ejemplo.test/raro?a=1&amp;b=2'), [c]);
    assert.deepEqual(unmatched, []);
    assert.equal(repaired, 1);
    assert.deepEqual(parseRadarItems(mdx), [
      { title: c.title, url: c.url, source: c.source, axis: 'economia', date: '2026-10-13' },
    ]);
    assert.deepEqual(editionErrors(edicion([]).replace(/\n$/, `\n${mdx}\n`), [c]), []);
  });

  test('un titular con comillas, ángulos y ampersands llega entero a los dos lectores', () => {
    const c = candidato(DE_TODO);
    const { mdx } = repairRadarItems(soloUrl(c.url), [c]);
    assert.equal(parseRadarItems(mdx)[0].title, DE_TODO);
    const [pintado] = parseNovedades(mdx);
    assert.equal(pintado.title, DE_TODO);
    assert.equal(pintado.source, c.source);
    assert.equal(pintado.url, c.url);
  });

  test('si el modelo teclea el titular con sus comillas, la etiqueta se rehace entera', () => {
    const c = candidato(COMILLAS);
    const tecleado = `<RadarItem title="${COMILLAS}"\n  source="Eurostat"\n  url="${c.url}"\n  date="2026-10-13"\n  axis="ia"\n>\n\nTexto.\n\n</RadarItem>`;
    assert.notEqual(parseRadarItems(tecleado)[0].title, COMILLAS, 'tal como llega no se puede leer');
    const { mdx } = repairRadarItems(tecleado, [c]);
    assert.equal(parseRadarItems(mdx)[0].title, COMILLAS);
    assert.doesNotMatch(mdx, /Dataset: updated data""/, 'no quedan restos del atributo roto');
  });

  test('reparar dos veces no cambia nada', () => {
    const c = candidato(DE_TODO);
    const una = repairRadarItems(soloUrl(c.url), [c]);
    const dos = repairRadarItems(una.mdx, [c]);
    assert.equal(dos.mdx, una.mdx);
    assert.equal(dos.repaired, 0);
  });

  test('una etiqueta que ningún lector puede leer no pasa por invisible', () => {
    // Sin atributos no hay url que comprobar: antes simplemente no se contaba.
    const conHueco = edicion([CHIP]).replace(/\n$/, '\n<RadarItem>\n\nUn ítem sin verificar.\n\n</RadarItem>\n');
    const errores = editionErrors(conHueco, CANDIDATOS);
    assert.equal(errores.length, 1, errores.join('\n'));
    assert.match(errores[0], /2 <RadarItem tags opened but only 1 could be read/);
  });
});

describe('el titular propio, en español', () => {
  // Lo único del ítem que escribe el modelo y no se puede cotejar con nada. Se
  // le exige lo que sí se puede comprobar; si no lo cumple, se quita el titular,
  // no la edición.
  const candidato = {
    title: 'Euro area annual inflation up to 3.8%',
    summary: 'In September 2026 the euro area annual inflation rate was 3.8%, up from 3.5% in August.',
    url: 'https://ejemplo.test/inflacion',
    source: 'Eurostat',
    axis: 'economia',
    publishedAt: '2026-10-02T09:00:00.000Z',
  };
  const tecleado = (titular: string, url = candidato.url) =>
    `<RadarItem url="${url}" titular="${titular}">\n\nQué pasó y por qué importa.\n\n</RadarItem>`;
  const BUENO = 'La inflación de la zona euro sube al 3,8 %';

  test('un titular fiel se conserva, y el literal sigue al lado', () => {
    const { mdx, titulares } = repairRadarItems(tecleado(BUENO), [candidato]);
    assert.deepEqual(titulares, { kept: 1, dropped: [] });
    const [leido] = parseRadarItems(mdx);
    assert.equal(leido.titular, BUENO);
    assert.equal(leido.title, candidato.title, 'el titular original no se toca');
    assert.deepEqual(editionErrors(edicion([]).replace(/\n$/, `\n${mdx}\n`), [candidato]), []);
    const [pintado] = parseNovedades(mdx);
    assert.equal(pintado.titular, BUENO);
    assert.equal(pintado.title, candidato.title);
  });

  test('la coma decimal no es una cifra distinta', () => {
    assert.deepEqual(titularProblems('La inflación sube del 3,5 % al 3,8 %', candidato), []);
  });

  const MALOS: [string, string, RegExp][] = [
    ['una cifra que la fuente no trae', 'La inflación de la zona euro sube al 4,1 %', /figure the source's title and summary do not: 4\.1/],
    ['una fecha que la fuente no trae', 'La inflación sube al 3,8 % y seguirá alta hasta 2028', /do not: 2028/],
    ['una cifra convertida', 'La inflación sube 380 puntos básicos', /do not: 380/],
    ['demasiado largo', `${BUENO}. ${'Y sigue contando cosas que no caben en un titular. '.repeat(3)}`, /characters long \(max 140\)/],
    ['vacío', '   ', /is empty/],
  ];
  for (const [nombre, titular, motivo] of MALOS) {
    test(`${nombre}: la reparación lo quita y la edición sale con el titular original`, () => {
      assert.match(titularProblems(titular, candidato).join('; '), motivo);
      const { mdx, titulares } = repairRadarItems(tecleado(titular), [candidato]);
      assert.equal(titulares.kept, 0);
      assert.equal(titulares.dropped.length, 1);
      assert.match(titulares.dropped[0].problems.join('; '), motivo);
      const [leido] = parseRadarItems(mdx);
      assert.equal('titular' in leido, false);
      assert.deepEqual(editionErrors(edicion([]).replace(/\n$/, `\n${mdx}\n`), [candidato]), []);
    });
  }

  test('si llega al gate sin pasar por la reparación, el gate lo rechaza', () => {
    const directo = [
      '<RadarItem',
      `  title="${candidato.title}"`,
      `  source="${candidato.source}"`,
      `  url="${candidato.url}"`,
      '  date="2026-10-02"',
      `  axis="${candidato.axis}"`,
      '  titular="La inflación de la zona euro sube al 4,1 %"',
      '>',
      '',
      'Texto.',
      '',
      '</RadarItem>',
    ].join('\n');
    const errores = editionErrors(edicion([]).replace(/\n$/, `\n${directo}\n`), [candidato]);
    assert.equal(errores.length, 1, errores.join('\n'));
    assert.match(errores[0], /titular rejected for https:\/\/ejemplo\.test\/inflacion/);
  });

  test('un titular con «>» dentro no corta la etiqueta', () => {
    // Con el buscador antiguo, la etiqueta acababa en el primer «>».
    const { mdx, titulares } = repairRadarItems(tecleado('Inflación > previsión: sube al 3,8 %'), [candidato]);
    assert.equal(titulares.kept, 1);
    assert.equal(parseRadarItems(mdx)[0].titular, 'Inflación > previsión: sube al 3,8 %');
    assert.equal(parseNovedades(mdx)[0].titular, 'Inflación > previsión: sube al 3,8 %');
    // En el fichero va codificado: el primer «>» que aparece es el que cierra la etiqueta.
    assert.equal(mdx.indexOf('>'), mdx.indexOf('\n>\n') + 1);
    assert.match(mdx, /titular="Inflación &gt; previsión: sube al 3,8 %"/);
  });

  test('un titular con comillas dobles deja la etiqueta mal formada: se quita, no se publica cortado', () => {
    const roto = tecleado('La inflación "sube" al 3,8 %');
    const { mdx, titulares } = repairRadarItems(roto, [candidato]);
    assert.equal(titulares.kept, 0);
    assert.deepEqual(titulares.dropped.map((d) => d.problems), [['the tag it came in was not well formed']]);
    assert.equal('titular' in parseRadarItems(mdx)[0], false);
    assert.doesNotMatch(mdx, /titular=/);
  });

  test('sin titular no pasa nada: se enseña el original', () => {
    const { mdx, titulares } = repairRadarItems(`<RadarItem url="${candidato.url}">\n\nTexto.\n\n</RadarItem>`, [candidato]);
    assert.deepEqual(titulares, { kept: 0, dropped: [] });
    assert.equal('titular' in parseNovedades(mdx)[0], false);
  });

  test('el límite que se le pide al modelo cabe en el que se comprueba', () => {
    const workflow = readFileSync(join(ROOT, '.github/workflows/noticias-diarias.yml'), 'utf8');
    const pedido = Number(workflow.match(/in at most (\d+) characters/)?.[1]);
    assert.ok(pedido > 0 && pedido <= TITULAR_MAX, `se piden ${pedido} y se aceptan ${TITULAR_MAX}`);
  });

  test('desde el workflow: la reparación dice cuántos conserva y cuáles quita', () => {
    const dir = mkdtempSync(join(tmpdir(), 'titular-'));
    const candidatos = join(dir, 'radar-candidates.json');
    const otro = { ...candidato, url: 'https://ejemplo.test/otra', title: 'Retail trade up by 0.1%' };
    writeFileSync(candidatos, JSON.stringify({ items: [candidato, otro] }));
    const fichero = join(dir, 'noticias.mdx');
    writeFileSync(fichero, edicion([]).replace(/\n$/, `\n${tecleado(BUENO)}\n\n${tecleado('El comercio minorista sube un 7 %', otro.url)}\n`));
    const env = { ...process.env, RADAR_CANDIDATES_PATH: candidatos };
    const reparar = spawnSync(process.execPath, [REPAIR, fichero], { cwd: ROOT, env, encoding: 'utf8' });
    assert.equal(reparar.status, 0, reparar.stderr);
    assert.match(reparar.stdout, /1 item\(s\) keep their own headline in Spanish; 1 dropped\./);
    assert.match(reparar.stdout, /::warning title=Headline dropped::https:\/\/ejemplo\.test\/otra — carries a figure/);
    const verificar = spawnSync(process.execPath, [VERIFY, fichero], { cwd: ROOT, env, encoding: 'utf8' });
    assert.equal(verificar.status, 0, verificar.stderr);
    assert.match(verificar.stdout, /ok — 2 items verified against real candidates \(1 with their own headline\)\./);
  });
});

describe('los dos lectores de <RadarItem> ven lo mismo', () => {
  // `parseNovedades` pinta la tira de la home y /noticias; `parseRadarItems` es
  // el que verifica. Si uno leyera un atributo que el otro no, la página podría
  // enseñar un titular que el gate nunca comprobó.
  const posts = join(ROOT, 'content/posts');
  const ediciones = readdirSync(posts).filter((name) => /^(noticias|radar)-.+\.mdx$/.test(name));

  test('hay ediciones publicadas que comparar', () => {
    assert.ok(ediciones.length > 0);
  });

  for (const name of ediciones) {
    test(name, () => {
      const mdx = readFileSync(join(posts, name), 'utf8');
      const verificados = parseRadarItems(mdx).filter((leido) => /^https:\/\//.test(leido.url ?? ''));
      const pintados = parseNovedades(mdx).map(({ title, url, source, axis, date, titular }) => ({
        title,
        url,
        source,
        axis,
        date,
        ...(titular === undefined ? {} : { titular }),
      }));
      assert.deepEqual(pintados, verificados);
    });
  }
});
