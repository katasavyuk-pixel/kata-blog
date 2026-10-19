import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import sharp from 'sharp';
import { newsletters } from '#site/content';
import {
  FORMATOS_DE_CORREO,
  SECUENCIA_EN_CORREO,
  enlaceDeCorreo,
  estilarHtml,
  gifDeSecuencia,
  imagenDeCorreo,
  partirCuerpo,
} from '@/lib/correo';
import {
  animacionesDeEdicion,
  esVisual,
  imagenesDeEdicion,
  skillDeEdicion,
  textoDeEdicion,
  textosDeEdicion,
  type Edicion,
} from '@/lib/edicion';
import { pendientes } from '@/lib/semanal';

/**
 * La newsletter corta y visual (2026-10-15: Kata eligió las dos, «N1» y «N2»).
 *
 * Lo que se prueba es lo que vería un suscriptor: el HTML que sale de la
 * plantilla, no los componentes. Las fotos van como JPEG recortado (Outlook no
 * enseña WebP y ningún cliente respeta `object-fit`), la secuencia como GIF, nada
 * de SVG ni de JavaScript, y una edición lista para enviar no sale si le falta
 * uno de sus ficheros: un correo con una imagen rota no se arregla después.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const SITIO = 'https://sitio.example';
const BAJA = `${SITIO}/api/unsubscribe?token=t`;

type Plantilla = {
  EdicionEmail: (props: { edicion: Edicion; brand: string; preview: string; siteUrl: string; unsubscribeUrl: string }) => unknown;
  render: (elemento: unknown) => Promise<string>;
};

/**
 * La plantilla de verdad, compilada con esbuild: el runner de tests borra tipos
 * pero no entiende JSX. Va dentro de .velite para que Node encuentre los
 * paquetes y el alias `#site/content` desde ahí.
 */
async function cargarPlantilla(): Promise<Plantilla> {
  const outfile = join(root, '.velite', 'pruebas', 'correos.mjs');
  mkdirSync(join(root, '.velite', 'pruebas'), { recursive: true });
  await build({
    stdin: {
      contents: 'export { EdicionEmail } from "@/emails/edicion"; export { render } from "@react-email/components";',
      resolveDir: root,
      loader: 'tsx',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    tsconfig: join(root, 'tsconfig.json'),
    packages: 'external',
    outfile,
    logLevel: 'silent',
  });
  return (await import(pathToFileURL(outfile).href)) as Plantilla;
}

const base: Edicion = {
  issue: '2026-s46',
  title: 'La semana del 9 al 15 de noviembre',
  date: '2026-11-15T00:00:00.000Z',
  tipo: 'semanal',
  semana: { desde: '2026-11-09T00:00:00.000Z', hasta: '2026-11-15T00:00:00.000Z' },
  html: '<p>Hola,</p>\n<p>Entrada.</p>\n<h3>Lo que ha pasado</h3>\n<p><strong>Otra</strong><br>\n<a href="https://example.com/o">Medio</a></p>',
};

const parte: Edicion = {
  ...base,
  html: '<h3>Lo importante de esta semana</h3>\n<p>Porque cambia los precios.</p>\n<h3>Lo que ha pasado</h3>\n<p><strong>Otra</strong><br>\n<a href="https://example.com/o">Medio</a></p>',
  construido: [
    {
      titulo: 'Con foto',
      url: '/blog/x',
      frase: 'Frase uno.',
      fecha: '2026-11-12T00:00:00.000Z',
      tipo: 'mejora',
      proyecto: 'blog',
      imagen: { src: '/covers/bienvenida.webp', alt: 'Foto' },
    },
    { titulo: 'Sin foto', url: 'https://github.com/x', frase: 'Frase dos.', fecha: '2026-11-11T00:00:00.000Z', tipo: 'lanzamiento', proyecto: 'skills' },
  ],
  importante: {
    titulo: 'La noticia',
    url: 'https://example.com/n',
    fuente: 'El Medio',
    imagen: { src: '/covers/radar.webp', alt: 'Radar' },
  },
  skill: 'prever-caja',
  pregunta: '¿Qué harías tú?',
};

describe('las rutas y el HTML del correo', () => {
  test('cada foto tiene su JPEG por recorte, bajo /correo', () => {
    assert.equal(imagenDeCorreo('/covers/bienvenida.webp', 'cabecera'), '/correo/covers/bienvenida-cabecera.jpg');
    assert.equal(imagenDeCorreo('/skills/prever-caja.webp', 'skill'), '/correo/skills/prever-caja-skill.jpg');
    assert.equal(gifDeSecuencia('2026-10-x'), '/correo/2026-10-x/secuencia.gif');
  });

  test('los enlaces al sitio dicen que vienen del correo; los de fuera, no', () => {
    const utm = 'utm_source=newsletter&utm_medium=email&utm_campaign=n1';
    assert.equal(enlaceDeCorreo('/blog/x', SITIO, 'n1'), `${SITIO}/blog/x?${utm}`);
    assert.equal(enlaceDeCorreo('/x?a=1', SITIO, 'n1'), `${SITIO}/x?a=1&${utm}`);
    assert.equal(enlaceDeCorreo('https://example.com/a', SITIO, 'n1'), 'https://example.com/a');
    const yaMarcado = `${SITIO}/x?utm_source=newsletter&utm_campaign=otra`;
    assert.equal(enlaceDeCorreo(yaMarcado, SITIO, 'n1'), yaMarcado, 'un enlace ya marcado no se marca dos veces.');
  });

  test('el cuerpo se parte por sus ###: el saludo primero, cada sección con su título', () => {
    const { entrada, secciones } = partirCuerpo('<p>Hola</p>\n<h3 id="a">Uno</h3>\n<p>1</p>\n<h3>Dos &#x26; tres</h3><p>2</p>');
    assert.equal(entrada, '<p>Hola</p>');
    assert.deepEqual(secciones, [
      { titulo: 'Uno', html: '<p>1</p>' },
      { titulo: 'Dos &#x26; tres', html: '<p>2</p>' },
    ]);
    assert.equal(partirCuerpo('<h3>Solo</h3><p>x</p>').entrada, '');
  });

  test('cada etiqueta lleva su estilo, y la que ya tenía uno se queda como estaba', () => {
    const html = estilarHtml('<p>a <a href="/x/">b</a></p><p style="margin:0">c</p><pre>d</pre><abbr>e</abbr><img src="/i.jpg" />');
    assert.match(html, /^<p style="margin:0 0 16px;[^"]*">a <a href="\/x\/" style="color:#c40f1f;[^"]*">b<\/a><\/p>/);
    assert.ok(html.includes('<p style="margin:0">c</p>'));
    assert.ok(html.includes('<pre>d</pre><abbr>e</abbr>'));
    assert.match(html, /<img src="\/i\.jpg" style="display:block;[^"]*" \/>$/);
  });
});

describe('cada edición tiene lo que su correo necesita', () => {
  const ediciones = newsletters as unknown as Edicion[];

  test('la skill que recomienda existe en el marketplace', () => {
    for (const edicion of ediciones) {
      if (edicion.skill) assert.ok(skillDeEdicion(edicion.skill), `${edicion.issue}: no hay skill «${edicion.skill}».`);
    }
  });

  test('una edición lista para enviar tiene sus JPEG y su GIF (npm run correo)', () => {
    for (const edicion of newsletters.filter((e) => !e.draft && !e.sent)) {
      const ficheros = [
        ...imagenesDeEdicion(edicion).map(({ src, formato }) => imagenDeCorreo(src, formato)),
        ...animacionesDeEdicion(edicion),
      ];
      for (const fichero of ficheros) {
        assert.ok(existsSync(join(root, 'public', fichero)), `${edicion.issue}: falta public${fichero}. Corre npm run correo.`);
      }
    }
  });

  test('los ficheros que ya están miden el doble de su hueco', async () => {
    for (const edicion of ediciones) {
      for (const { src, formato } of imagenesDeEdicion(edicion)) {
        const fichero = join(root, 'public', imagenDeCorreo(src, formato));
        if (!existsSync(fichero)) continue;
        const { width, height } = await sharp(fichero).metadata();
        const { ancho, alto } = FORMATOS_DE_CORREO[formato];
        assert.deepEqual([width, height], [ancho * 2, alto * 2], fichero);
      }
      for (const gif of animacionesDeEdicion(edicion)) {
        const fichero = join(root, 'public', gif);
        if (!existsSync(fichero)) continue;
        const { width, height, pages } = await sharp(fichero, { animated: true }).metadata();
        assert.equal(width, SECUENCIA_EN_CORREO.ancho * 2, fichero);
        assert.equal(height, SECUENCIA_EN_CORREO.alto * 2 * (pages ?? 1), fichero);
        assert.ok((pages ?? 1) > 1, `${fichero} no se mueve.`);
      }
    }
  });

  test('un {{bloque}} sin escribir en los bloques también frena el envío', () => {
    const borrador: Edicion = { ...parte, pregunta: '{{PREGUNTA: una}}', importante: { ...parte.importante!, titulo: '{{TÍTULO: dos}}' } };
    assert.deepEqual(pendientes(...textosDeEdicion(borrador)), ['{{TÍTULO: dos}}', '{{PREGUNTA: una}}']);
    assert.deepEqual(pendientes(...textosDeEdicion(parte)), []);
  });
});

describe('la plantilla, en el HTML que sale', () => {
  let plantilla: Plantilla;
  const html = (edicion: Edicion) =>
    plantilla.render(plantilla.EdicionEmail({ edicion, brand: 'Kata Ivanovych', preview: 'p', siteUrl: SITIO, unsubscribeUrl: BAJA }));
  const enOrden = (correo: string, piezas: string[]) => {
    // From <body> on: React lists the images to preload in <head>, before everything.
    const texto = correo.slice(correo.indexOf('<body'));
    const posiciones = piezas.map((pieza) => texto.indexOf(pieza));
    assert.ok(posiciones.every((p) => p >= 0), `falta alguna de ${piezas.join(', ')}`);
    assert.deepEqual([...posiciones].sort((a, b) => a - b), posiciones, `fuera de orden: ${piezas.join(' < ')}`);
  };
  const sinLoQueUnCorreoNoAguanta = (correo: string) => {
    assert.doesNotMatch(correo, /<svg|<script|\.webp/i);
    assert.doesNotMatch(correo, /border-radius/, 'esquinas rectas, también en el correo.');
  };

  before(async () => {
    plantilla = await cargarPlantilla();
  });

  test('N1: foto, «En un minuto», la secuencia en GIF y el cuerpo', async () => {
    const maquina = newsletters.find((e) => e.issue === '2026-10-maquina-bienvenida')!;
    assert.ok(esVisual(maquina));
    const correo = await html(maquina);
    sinLoQueUnCorreoNoAguanta(correo);
    enOrden(correo, [
      `${SITIO}/correo/covers/bienvenida-cabecera.jpg`,
      'La máquina de bienvenida, por dentro',
      'En un minuto',
      `${SITIO}${gifDeSecuencia(maquina.issue)}`,
      'Hola,',
    ]);
    for (const punto of maquina.minuto!) assert.ok(correo.includes(punto), punto);
    assert.ok(correo.includes(`alt="${maquina.secuencia!.alt}"`), 'la secuencia se cuenta en palabras para quien no ve la imagen.');
    assert.doesNotMatch(correo, /Por dónde seguir/, 'la edición visual acaba en su pregunta, sin el cierre estándar.');
  });

  test('N2: lo importante primero, luego lo construido, la skill, el resto de la semana al final y la pregunta', async () => {
    const correo = await html(parte);
    sinLoQueUnCorreoNoAguanta(correo);
    enOrden(correo, [
      'Edición semanal',
      'Lo importante de esta semana',
      `${SITIO}/correo/covers/radar-ancha.jpg`,
      'La noticia',
      'Porque cambia los precios.',
      'Leer la noticia · El Medio',
      'Lo que he construido',
      `${SITIO}/correo/covers/bienvenida-tarjeta.jpg`,
      'Skills',
      'Para usar esta semana',
      `${SITIO}/correo/skills/prever-caja-skill.jpg`,
      'Instalarla en tu agente',
      'Lo que ha pasado',
      '¿Qué harías tú?',
      'Lo leo yo.',
      BAJA,
    ]);
    assert.ok(correo.includes(`${SITIO}/marketplace/prever-caja?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=2026-s46`));
    assert.ok(correo.includes(`${SITIO}/blog/x?utm_source=newsletter`), 'lo construido enlaza al sitio con su campaña.');
    assert.ok(correo.includes('href="https://example.com/n"'), 'la noticia de fuera va tal cual.');
  });

  test('una edición sin bloques es su cuerpo, con el cierre de siempre', async () => {
    const correo = await html({ ...base, tipo: 'sistema', semana: undefined });
    assert.match(correo, /Por dónde seguir/);
    assert.doesNotMatch(correo, /En un minuto|Lo importante de esta semana|Una cosa que te pido/);
    assert.equal((correo.match(/Lo que ha pasado/g) ?? []).length, 1, 'cada sección del cuerpo, una vez.');
  });

  test('el texto plano lleva los mismos bloques que el HTML', () => {
    const texto = textoDeEdicion(parte, (url) => enlaceDeCorreo(url, SITIO, parte.issue));
    for (const pieza of ['LO IMPORTANTE DE ESTA SEMANA', 'La noticia', 'Porque cambia los precios.', 'Leer la noticia · El Medio: https://example.com/n', 'LO QUE HE CONSTRUIDO', 'LO QUE HA PASADO', 'PARA USAR ESTA SEMANA', 'Prever la caja', 'Una cosa que te pido: ¿Qué harías tú?', 'Lo leo yo.']) {
      assert.ok(texto.includes(pieza), pieza);
    }
    assert.ok(texto.indexOf('LO IMPORTANTE') < texto.indexOf('LO QUE HE CONSTRUIDO'), 'el texto plano sigue el orden del HTML.');
    assert.ok(texto.indexOf('PARA USAR ESTA SEMANA') < texto.indexOf('LO QUE HA PASADO'), 'el resto de la semana va al final, también en texto.');
    assert.ok(texto.includes(`${SITIO}/marketplace/prever-caja?utm_source=newsletter`));
  });
});

describe('la prueba a tu buzón', () => {
  // Read from the source: the send needs Resend and Supabase, and what matters
  // here is what the function cannot do, whatever the services answer.
  const lib = readFileSync(join(root, 'src/lib/newsletter.tsx'), 'utf8');
  const prueba = lib.slice(lib.indexOf('export async function sendTestIssue'), lib.indexOf('/**\n * Send one issue to every confirmed subscriber.'));

  test('va solo a la dirección de respuesta, con «[PRUEBA]» en el asunto', () => {
    assert.match(prueba, /mensajeDeEdicion\(issue, REPLY_TO, `\$\{siteConfig\.url\}\/newsletter`, REPLY_TO, `\[PRUEBA\] \$\{issue\.subject\}`\)/);
  });

  test('no escribe nada: ni reclama la edición, ni lee la lista, ni la marca enviada', () => {
    assert.ok(prueba.length > 0, 'falta sendTestIssue.');
    assert.doesNotMatch(prueba, /supabase|newsletter_issues|subscribers|batch/);
  });

  test('la ruta la atiende antes del envío a la lista y detrás del mismo secreto', () => {
    const ruta = readFileSync(join(root, 'src/app/api/newsletter/send/route.ts'), 'utf8');
    assert.ok(ruta.indexOf('Bearer ${secret}') < ruta.indexOf('if (body.prueba)'));
    assert.ok(ruta.indexOf('if (body.prueba)') < ruta.indexOf('await sendIssue('));
  });
});

describe('el enlace de lo importante', () => {
  test('dice lo que tiene que decir: su rótulo, la fuente si es noticia, o «Saber más»', async () => {
    const { rotuloDeImportante } = await import('@/lib/edicion');
    assert.equal(rotuloDeImportante({ rotulo: 'Pedir la hoja', fuente: 'El Medio' }), 'Pedir la hoja');
    assert.equal(rotuloDeImportante({ fuente: 'El Medio' }), 'Leer la noticia · El Medio');
    assert.equal(rotuloDeImportante({}), 'Saber más');
  });
});

