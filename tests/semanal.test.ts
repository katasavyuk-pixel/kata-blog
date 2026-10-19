import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sitemap from '@/app/sitemap';
import { siteConfig } from '@/config/site';
import {
  mesesPublicados,
  metadataDeMes,
  nombreDeMes,
  semanasDelMes,
  semanasPublicadas,
  sinUtm,
  tituloDeMes,
  type EdicionEnviable,
} from '@/lib/mensual';
import { sentIssues } from '@/lib/newsletter-archive';
import { DESCRIPCION_MAX, TITULO_MAX } from '@/lib/seo';
import {
  MAX_NOTICIAS,
  MAX_POR_EJE,
  MAX_PROTAGONISTAS,
  TITULO_IMPORTANTE,
  TITULO_NOTICIAS,
  borradorSemanal,
  elegir,
  esBorradorSemanal,
  enSemana,
  idDeSemana,
  pendientes,
  rangoLegible,
  reunir,
  seccionDeNoticias,
  semanaHasta,
  type NoticiaSemanal,
} from '@/lib/semanal';

/**
 * La edición semanal y la página del mes.
 *
 * La diaria la escribe un modelo y sale sin que nadie la lea. La semanal es lo
 * contrario: un borrador que el sistema prepara y que solo una persona puede
 * terminar. Lo que se prueba aquí es esa frontera: el borrador nunca es
 * enviable tal como sale, el envío se niega mientras quede un bloque por
 * escribir, y la página del mes solo existe con ediciones ya enviadas.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');

const SEMANA = semanaHasta('2026-10-18');

const novedad = (n: number, over: Partial<{ axis: string; titular: string; url: string }> = {}) => ({
  url: over.url ?? `https://example.com/${n}`,
  title: `Source headline ${n}`,
  titular: over.titular,
  source: `Medio ${n}`,
  axis: over.axis ?? 'ia',
  category: 'modelos',
  date: '2026-10-15',
  resumen: `Resumen ${n}.`,
});

const noticia = (n: number, over: Partial<NoticiaSemanal> = {}): NoticiaSemanal => ({
  fecha: '2026-10-15',
  eje: 'ia',
  medio: `Medio ${n}`,
  url: `https://example.com/${n}`,
  titular: `Titular ${n}`,
  enEspanol: true,
  resumen: `Resumen ${n}.`,
  protagonista: false,
  ...over,
});

describe('la semana', () => {
  test('son siete días, con los dos extremos dentro', () => {
    assert.deepEqual(SEMANA, { desde: '2026-10-12', hasta: '2026-10-18' });
    assert.ok(enSemana('2026-10-12', SEMANA));
    assert.ok(enSemana('2026-10-18T05:00:00.000Z', SEMANA));
    assert.ok(!enSemana('2026-10-11', SEMANA));
    assert.ok(!enSemana('2026-10-19', SEMANA));
  });

  test('una fecha que no existe o mal escrita se rechaza', () => {
    assert.throws(() => semanaHasta('18-10-2026'), /AAAA-MM-DD/);
    assert.throws(() => semanaHasta('2026-13-40'), /AAAA-MM-DD/);
  });

  test('el id es el año y la semana ISO del último día, también en el cambio de año', () => {
    assert.equal(idDeSemana('2026-10-13'), '2026-s42');
    assert.equal(idDeSemana('2026-10-18'), '2026-s42');
    assert.equal(idDeSemana('2026-10-19'), '2026-s43');
    // 2026 has 53 ISO weeks; the first days of January still belong to it.
    assert.equal(idDeSemana('2027-01-03'), '2026-s53');
    assert.equal(idDeSemana('2027-01-04'), '2027-s01');
    assert.equal(idDeSemana('2024-12-30'), '2025-s01');
  });

  test('el rango se lee como lo diría una persona', () => {
    assert.equal(rangoLegible(SEMANA), 'del 12 al 18 de octubre');
    assert.equal(rangoLegible(semanaHasta('2026-10-04')), 'del 28 de septiembre al 4 de octubre');
  });
});

describe('qué entra en el borrador', () => {
  test('cada noticia cuenta una vez, y la protagonista no se repite como breve', () => {
    const noticias = reunir(
      SEMANA,
      [
        { date: '2026-10-14', novedades: [novedad(1), novedad(2)] },
        { date: '2026-10-16', novedades: [novedad(2), novedad(3), novedad(9, { url: 'https://fuente.example/a' })] },
        { date: '2026-10-05', novedades: [novedad(4)] },
      ],
      [
        {
          date: '2026-10-16',
          title: 'El artículo del día',
          description: 'Qué cambia.',
          permalink: '/blog/noticia-2026-10-16',
          medio: 'Fuente',
          fuenteUrl: 'https://fuente.example/a',
        },
        { date: '2026-10-01', title: 'Otra semana', description: '', permalink: '/blog/noticia-2026-10-01', medio: 'X' },
      ],
    );
    assert.deepEqual(
      noticias.map((n) => n.url),
      ['/blog/noticia-2026-10-16', 'https://example.com/2', 'https://example.com/3', 'https://example.com/1'],
    );
    assert.equal(noticias[0].protagonista, true);
  });

  test('sin titular en español se usa el de la fuente, y queda dicho', () => {
    const [sin, con] = reunir(
      SEMANA,
      [{ date: '2026-10-14', novedades: [novedad(1), novedad(2, { titular: 'En español' })] }],
      [],
    );
    assert.deepEqual([sin.titular, sin.enEspanol], ['Source headline 1', false]);
    assert.deepEqual([con.titular, con.enEspanol], ['En español', true]);
  });

  test('se nombra el medio, no la etiqueta de su feed', () => {
    const medios: Record<string, string> = { 'Medio 1': 'El Medio', 'Feed AI': 'El Diario' };
    const noticias = reunir(
      SEMANA,
      [{ date: '2026-10-14', novedades: [novedad(1), novedad(2)] }],
      [{ date: '2026-10-15', title: 'T', description: 'D', permalink: '/blog/noticia-2026-10-15', medio: 'Feed AI' }],
      (fuente) => medios[fuente] ?? fuente,
    );
    assert.deepEqual(noticias.map((n) => n.medio), ['El Diario', 'El Medio', 'Medio 2']);
  });

  test('la lista es corta y ningún eje la llena', () => {
    const muchas = [
      ...[1, 2, 3, 4, 5].map((n) => noticia(n, { protagonista: true, eje: undefined })),
      ...[6, 7, 8, 9].map((n) => noticia(n, { eje: 'ia' })),
      ...[10, 11, 12].map((n) => noticia(n, { eje: 'negocio' })),
      ...[13, 14, 15].map((n) => noticia(n, { eje: 'economia' })),
      ...[16, 17].map((n) => noticia(n, { eje: 'geopolitica' })),
    ];
    const elegidas = elegir(muchas);
    assert.equal(elegidas.length, MAX_NOTICIAS);
    assert.equal(elegidas.filter((n) => n.protagonista).length, MAX_PROTAGONISTAS);
    for (const eje of ['ia', 'negocio', 'economia', 'geopolitica']) {
      assert.ok(elegidas.filter((n) => n.eje === eje).length <= MAX_POR_EJE, `${eje} pasa del tope.`);
    }
    assert.deepEqual(
      elegidas.filter((n) => !n.protagonista).map((n) => n.medio),
      ['Medio 6', 'Medio 7'],
    );
  });
});

describe('el borrador', () => {
  const borrador = borradorSemanal({
    semana: SEMANA,
    elegidas: [
      noticia(1, {
        protagonista: true,
        url: '/blog/noticia-2026-10-16',
        eje: undefined,
        imagen: { src: '/covers/noticia-2026-10-16.webp', alt: 'Una "foto"' },
      }),
      noticia(2, { titular: 'Headline [in English]', enEspanol: false, url: 'https://example.com/a_(b)' }),
      noticia(3, { protagonista: true, url: '/blog/noticia-2026-10-17', eje: undefined }),
    ],
    total: 23,
    skill: 'prever-caja',
    siteUrl: 'https://sitio.example',
    generado: '2026-10-19',
  });

  test('nace como borrador de la semana, con su id estable', () => {
    assert.match(borrador, /^issue: 2026-s42$/m);
    assert.match(borrador, /^tipo: semanal$/m);
    assert.match(borrador, /^draft: true$/m);
    assert.match(borrador, /^ {2}desde: 2026-10-12\n {2}hasta: 2026-10-18$/m);
    assert.doesNotMatch(borrador, /^sent:/m);
  });

  test('lo que solo puede decir una persona es un bloque sin escribir', () => {
    // The header's own comments mention the blocks; they never reach the email.
    const sinCabecera = borrador.replace(/^#.*$/gm, '');
    const bloques = pendientes(sinCabecera).map((b) => b.slice(2, b.indexOf(':')));
    assert.deepEqual(bloques, ['ASUNTO', 'ANTETÍTULO', 'PREGUNTA', 'LO IMPORTANTE']);
  });

  test('los bloques sin escribir caben en el esquema: un borrador recién escrito no rompe la build', () => {
    // `velite build --strict` failed on a fresh draft because the ASUNTO placeholder
    // was longer than the 120 characters `subject` allows. Limits: velite.config.ts.
    const campo = (nombre: string) => borrador.match(new RegExp(`^${nombre}: "(.*)"$`, 'm'))?.[1] ?? '';
    assert.ok(campo('subject').length > 0 && campo('subject').length <= 120, `subject: ${campo('subject').length}`);
    assert.ok(campo('preheader').length > 0 && campo('preheader').length <= 200, `preheader: ${campo('preheader').length}`);
    assert.ok(campo('pregunta').length > 0 && campo('pregunta').length <= 300, `pregunta: ${campo('pregunta').length}`);
  });

  test('el borrador recuerda que el asunto lleva emoji delante', () => {
    assert.match(borrador, /^# {3}\[ \] Asunto: un emoji delante/m);
  });

  test('una a la semana, alrededor de lo importante: el texto es tuyo y la noticia más fuerte va de propuesta', () => {
    // The card is frontmatter, drawn by the email and the archive (src/lib/edicion.ts).
    assert.match(
      borrador,
      /^importante:\n {2}titulo: "Titular 1"\n {2}url: "\/blog\/noticia-2026-10-16"\n {2}fuente: "Medio 1"\n {2}imagen:\n {4}src: "\/covers\/noticia-2026-10-16\.webp"\n {4}alt: "Una \\"foto\\""$/m,
    );
    // The text is the body's first section, and only the editor writes it.
    const cuerpoEntero = borrador.slice(borrador.indexOf('\n---\n') + 5).trim();
    assert.ok(cuerpoEntero.startsWith(`### ${TITULO_IMPORTANTE}\n\n{{LO IMPORTANTE: `), cuerpoEntero.slice(0, 80));
    assert.match(borrador, /^skill: prever-caja$/m);
    assert.match(borrador, /^pregunta: "\{\{PREGUNTA: /m);
    const cuerpo = borrador.slice(borrador.indexOf('\n---\n') + 5);
    assert.doesNotMatch(cuerpo, /Titular 1/, 'la destacada no se repite en la lista.');
    assert.ok(cuerpo.indexOf(`### ${TITULO_NOTICIAS}`) < cuerpo.indexOf('Headline'));
  });

  test('la cabecera dice cuánto se quedó fuera y qué falta por traducir', () => {
    assert.match(borrador, /# Semana del 12 al 18 de octubre: 23 noticias distintas[^\n]*aquí van 3\./);
    assert.match(borrador, /# {3}\[ \] 1 titular\(es\) siguen en el idioma de la fuente/);
  });

  test('los enlaces propios llevan la campaña; los de las fuentes van limpios', () => {
    const utm = 'utm_source=newsletter&utm_medium=email&utm_campaign=2026-s42';
    assert.ok(borrador.includes(`(https://sitio.example/blog/noticia-2026-10-17?${utm})`));
    // Brackets and parentheses would otherwise cut the markdown link short.
    assert.ok(borrador.includes('**Headline \\[in English\\]**\\\n[Medio 2]'), 'el titular va en su línea, con el salto que el editor no borra al guardar.');
    assert.doesNotMatch(borrador, /Resumen \d/, 'del resto de la semana, solo el titular: el correo es corto.');
    assert.ok(borrador.includes('[Medio 2](https://example.com/a_%28b%29)'));
  });

  test('mientras es borrador se reconoce como tal; firmado, deja de serlo', () => {
    assert.equal(esBorradorSemanal(borrador), true);
    assert.equal(esBorradorSemanal(borrador.replace(/^draft: true$/m, 'draft: false')), false);
    assert.equal(esBorradorSemanal(borrador.replace(/^tipo: semanal$/m, 'tipo: sistema')), false);
    // Only the frontmatter counts: a body that quotes the words is not a draft.
    assert.equal(esBorradorSemanal('---\nissue: x\ndraft: false\n---\n\ntipo: semanal\ndraft: true\n'), false);
    assert.match(
      source('tests/promesa.test.ts'),
      /content\/newsletters'\)\)\.filter\(\(f\) => !esBorradorSemanal\(/,
      'el test de la promesa vuelve a leer los borradores semanales.',
    );
  });

  test('una semana sin ediciones: lo importante sigue siendo tuyo, sin tarjeta propuesta ni lista', () => {
    const vacio = borradorSemanal({ semana: SEMANA, elegidas: [], total: 0, siteUrl: 'https://sitio.example', generado: '2026-10-19' });
    assert.match(vacio, /\{\{LO IMPORTANTE: [^}]*No hubo ediciones diarias/);
    assert.doesNotMatch(vacio, /^(importante|construido|skill):/m);
    assert.ok(!vacio.includes(`### ${TITULO_NOTICIAS}`), 'sin noticias, no hay lista.');
  });

  test('lo que entró en la bitácora esa semana va con su prueba enlazada, las tres últimas', () => {
    const entrada = (titulo: string, url: string) => ({
      titulo,
      url,
      frase: 'Gratis.',
      fecha: '2026-10-15',
      tipo: 'mejora' as const,
      proyecto: 'skills' as const,
    });
    const conObra = borradorSemanal({
      semana: SEMANA,
      elegidas: [],
      total: 0,
      construido: [
        { ...entrada('Mis vídeos vuelven al blog', '/videos'), imagen: { src: '/covers/videos.webp', alt: 'El canal' } },
        entrada('Seis skills [en abierto]', 'https://github.com/katasavyuk-pixel/skills-negocio-pequeno'),
        entrada('Tercera', '/bitacora'),
        entrada('Cuarta', '/bitacora'),
      ],
      siteUrl: 'https://sitio.example',
      generado: '2026-10-19',
    });
    assert.match(
      conObra,
      /^construido:\n {2}- titulo: "Mis vídeos vuelven al blog"\n {4}url: "\/videos"\n {4}frase: "Gratis\."\n {4}fecha: 2026-10-15\n {4}tipo: mejora\n {4}proyecto: skills\n {4}imagen:\n {6}src: "\/covers\/videos\.webp"/m,
    );
    assert.match(conObra, /- titulo: "Seis skills \[en abierto\]"/, 'en YAML entre comillas, los corchetes van tal cual.');
    assert.doesNotMatch(conObra, /Cuarta/);
    assert.match(conObra, /# De la bitácora: 4 entradas esta semana; aquí van las 3 últimas\./);
  });
});

describe('el envío se niega mientras quede un bloque', () => {
  test('pendientes los encuentra también como los deja el markdown dentro de un enlace', () => {
    assert.deepEqual(pendientes('Hola', '{{ASUNTO: a}} y {{OTRO:\nb}}'), ['{{ASUNTO: a}}', '{{OTRO:\nb}}']);
    assert.deepEqual(pendientes('<a href="%7B%7Burl%7D%7D/x">x</a>'), ['%7B%7Burl%7D%7D']);
    assert.deepEqual(pendientes('Sin bloques', '<p>{ uno } y } otro {</p>'), []);
  });

  test('getSendableIssue los mira en el asunto, el antetítulo, el título y el cuerpo', () => {
    const lib = source('src/lib/newsletter.tsx');
    const guarda = lib.slice(lib.indexOf('export function getSendableIssue'), lib.indexOf('const sleep'));
    assert.match(guarda, /pendientes\(issue\.subject, issue\.preheader, issue\.title, issue\.html, \.\.\.textosDeEdicion\(issue\)\)/);
    assert.match(guarda, /sinEscribir\.length > 0\) \{\s*throw new NewsletterError/);
    assert.ok(guarda.indexOf('pendientes(') < guarda.lastIndexOf('return issue'), 'la guarda va antes de devolver la edición.');
  });

  test('una semanal sin los días que cubre no pasa el esquema', () => {
    const velite = source('velite.config.ts');
    assert.match(velite, /tipo: s\.enum\(\["sistema", "semanal"\]\)\.default\("sistema"\)/);
    assert.match(velite, /\.refine\(\(data\) => data\.tipo !== "semanal" \|\| Boolean\(data\.semana\)/);
  });
});

describe('el generador', () => {
  const dir = mkdtempSync(join(tmpdir(), 'semanal-'));
  const salida = join(dir, 'borrador.md');
  const run = (...extra: string[]) =>
    spawnSync(
      process.execPath,
      [
        '--no-warnings',
        '--experimental-strip-types',
        '--import',
        './tests/alias-hook.ts',
        'scripts/radar/weekly-draft.ts',
        '--hasta',
        '2026-10-13',
        '--salida',
        salida,
        ...extra,
      ],
      { cwd: root, encoding: 'utf8' },
    );

  test('escribe el borrador de una semana real y no lo pisa sin --forzar', (t) => {
    t.after(() => rmSync(dir, { recursive: true, force: true }));

    const primero = run();
    assert.equal(primero.status, 0, primero.stderr);
    const borrador = readFileSync(salida, 'utf8');
    assert.match(borrador, /^issue: 2026-s42$/m);
    assert.match(borrador, /^draft: true$/m);
    assert.ok(borrador.includes(`### ${TITULO_NOTICIAS}`));
    assert.ok(pendientes(borrador).length >= 4);
    // Outlets, not feed labels: the week's lead articles came from the "TechCrunch AI" feed.
    assert.doesNotMatch(borrador, /TechCrunch AI|The Guardian AI/);
    assert.match(borrador, /fuente: TechCrunch\n/);

    const segundo = run();
    assert.equal(segundo.status, 1);
    assert.match(segundo.stderr, /ya existe/);
    assert.equal(run('--forzar').status, 0);

    // Once somebody takes `draft: true` off, the file is theirs.
    writeFileSync(salida, borrador.replace(/^draft: true$/m, 'draft: false'));
    const tercero = run('--forzar');
    assert.equal(tercero.status, 1);
    assert.match(tercero.stderr, /ya no es un borrador/);
  });
});

describe('la página del mes', () => {
  // The shape Velite gives the draft's markdown.
  const html = (campaña: string) =>
    '<p>Hola,</p>\n<p>Entrada.</p>\n' +
    `<h3>${TITULO_NOTICIAS}</h3>\n` +
    `<p><strong>Un titular</strong><br>\nResumen. <a href="https://sitio.example/blog/x?utm_source=newsletter&#x26;utm_medium=email&#x26;utm_campaign=${campaña}">Leer el artículo</a></p>\n` +
    '<p><strong>Otro</strong><br>\nResumen. <a href="https://example.com/a?id=3&#x26;utm_x=1#b">Medio</a></p>\n' +
    '<h3>Una reflexión</h3>\n<p>…</p>';

  const edicion = (issue: string, hasta: string, over: Partial<EdicionEnviable> = {}): EdicionEnviable => ({
    issue,
    tipo: 'semanal',
    semana: { desde: `${semanaHasta(hasta).desde}T00:00:00.000Z`, hasta: `${hasta}T00:00:00.000Z` },
    sent: true,
    permalink: `/newsletter/${issue}`,
    html: html(issue),
    ...over,
  });

  const EDICIONES = [
    edicion('2026-s42', '2026-10-18'),
    edicion('2026-s44', '2026-11-01'),
    edicion('2026-s43', '2026-10-25'),
    edicion('2026-s45', '2026-11-08', { sent: false }),
    edicion('2026-10-un-sistema', '2026-10-20', { tipo: 'sistema' }),
    edicion('2026-s41', '2026-10-11', { html: '<p>Sin apartado de noticias.</p>' }),
  ];

  test('la sección de noticias es lo que hay entre su título y el siguiente', () => {
    const seccion = seccionDeNoticias(html('2026-s42'));
    assert.ok(seccion);
    assert.match(seccion, /^<p><strong>Un titular<\/strong>/);
    assert.match(seccion, /Medio<\/a><\/p>$/);
    assert.equal(seccionDeNoticias('<h3>Otra cosa</h3><p>…</p>'), null);
    assert.equal(seccionDeNoticias(`<h3>${TITULO_NOTICIAS}</h3>\n<h3>Vacía</h3>`), null);
  });

  test('lo importante encabeza su semana: título, el texto del editor y su enlace', () => {
    const [semana] = semanasPublicadas([
      edicion('2026-s46', '2026-11-15', {
        html: `<h3>${TITULO_IMPORTANTE}</h3>\n<p>Porque sí.</p>\n${html('2026-s46').slice(html('2026-s46').indexOf('<h3>'))}`,
        importante: { titulo: 'Lo <grande>', url: '/blog/noticia-x', fuente: 'Medio' },
      }),
    ]);
    assert.match(
      semana.noticiasHtml,
      /^<p><strong>Lo &lt;grande&gt;<\/strong><\/p>\n<p>Porque sí\.<\/p>\n<p><a href="\/blog\/noticia-x">Leer la noticia · Medio<\/a><\/p>\n<p><strong>Un titular/,
    );
    const soloLoImportante = semanasPublicadas([
      edicion('2026-s47', '2026-11-22', { html: `<h3>${TITULO_IMPORTANTE}</h3>\n<p>Algo mío.</p>` }),
    ]);
    assert.equal(soloLoImportante.length, 1, 'una semana con solo lo importante, sin noticias, también tiene página.');
    assert.equal(soloLoImportante[0].noticiasHtml, '<p>Algo mío.</p>');
  });

  test('solo cuentan las semanales enviadas que traen noticias', () => {
    assert.deepEqual(
      semanasPublicadas(EDICIONES).map((s) => s.issue),
      ['2026-s44', '2026-s43', '2026-s42'],
    );
  });

  test('una semana pertenece al mes de su último día', () => {
    assert.deepEqual(mesesPublicados(EDICIONES), ['2026-11', '2026-10']);
    assert.deepEqual(semanasDelMes('2026-10', EDICIONES).map((s) => s.rango), ['del 19 al 25 de octubre', 'del 12 al 18 de octubre']);
    assert.deepEqual(semanasDelMes('2026-11', EDICIONES).map((s) => s.rango), ['del 26 de octubre al 1 de noviembre']);
    assert.deepEqual(semanasDelMes('2026-12', EDICIONES), []);
  });

  test('en la web los enlaces no dicen venir de un correo', () => {
    const [semana] = semanasDelMes('2026-11', EDICIONES);
    assert.doesNotMatch(semana.noticiasHtml, /utm_/);
    assert.ok(semana.noticiasHtml.includes('href="https://sitio.example/blog/x"'));
    assert.ok(semana.noticiasHtml.includes('href="https://example.com/a?id=3#b"'));
    // A link with nothing to remove is left exactly as it was written.
    for (const intacto of ['<a href="/x?a=1&amp;b=2#c">x</a>', '<a href="/x?a=1&#x26;b=2">x</a>', '<a href="https://example.com/#utm_x">x</a>']) {
      assert.equal(sinUtm(intacto), intacto);
    }
    assert.equal(sinUtm('<a href="/x?utm_source=a&amp;b=2&#38;utm_medium=c">x</a>'), '<a href="/x?b=2">x</a>');
  });

  test('un mes sin edición enviada no tiene página', () => {
    assert.equal(metadataDeMes('2026-12', EDICIONES), null);
    assert.equal(metadataDeMes('octubre', EDICIONES), null);
    assert.equal(nombreDeMes('2026-13'), null);
    assert.equal(nombreDeMes('2026-1'), null);
  });

  test('el título es la búsqueda y cabe en el resultado, en cualquier mes', () => {
    for (let m = 1; m <= 12; m += 1) {
      const mes = `2026-${String(m).padStart(2, '0')}`;
      const meta = metadataDeMes(mes, [edicion('x', `${mes}-15`)]);
      assert.ok(meta, `${mes} no tiene metadatos.`);
      const title = (meta.title as { absolute: string }).absolute;
      assert.match(title, /^Novedades de IA de [a-z]+ 2026 /);
      assert.ok(title.length <= TITULO_MAX, `«${title}» mide ${title.length}.`);
      assert.ok((meta.description ?? '').length <= DESCRIPCION_MAX, `La descripción de ${mes} mide ${meta.description?.length}.`);
      assert.equal(meta.alternates?.canonical, `/noticias/${mes}`);
    }
    assert.equal(tituloDeMes('octubre 2026'), 'Novedades de IA de octubre 2026: qué cambia para tu negocio');
  });

  test('la página, el sitemap y /noticias salen de la misma lista', () => {
    const pagina = source('src/app/noticias/[mes]/page.tsx');
    assert.match(pagina, /generateStaticParams\(\) \{\s*return mesesPublicados\(\)\.map/);
    assert.match(pagina, /semanas\.length === 0\) notFound\(\)/);
    assert.match(source('src/app/noticias/page.tsx'), /const meses = mesesPublicados\(\);/);

    const urls = sitemap().map((entry) => entry.url);
    const esperadas = mesesPublicados().map((mes) => `${siteConfig.url}/noticias/${mes}`);
    assert.deepEqual(urls.filter((url) => /\/noticias\/\d{4}-\d{2}$/.test(url)), esperadas);
  });

  test('lo publicado: cada mes sale de ediciones que ya están en el archivo', () => {
    const archivo = new Set(sentIssues.map((issue) => issue.issue));
    for (const mes of mesesPublicados()) {
      for (const semana of semanasDelMes(mes)) {
        assert.ok(archivo.has(semana.issue), `${mes} enseña ${semana.issue}, que no está enviada.`);
        assert.deepEqual(pendientes(semana.noticiasHtml), [], `${semana.issue} se publicó con un bloque sin escribir.`);
      }
    }
  });
});
