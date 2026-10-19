import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';
import {
  CLAVE_LENTE,
  DESDE_LENTE,
  ETIQUETA_DE_LENTE,
  LENTES,
  LENTE_POR_DEFECTO,
  SCRIPT_LENTE,
  esLente,
  perspectivasDe,
  resolverLente,
} from '@/lib/impacto';
import { getArticulosNoticia } from '@/lib/posts';

/**
 * La lente del lector: desde qué silla lee la noticia.
 *
 * Las tres lecturas van siempre en el HTML y es el CSS quien enseña una, según
 * `data-lente` en <html>. Lo que puede fallar sin que se note: que el enlace
 * no mande sobre lo guardado, que una lente nueva se quede sin su regla en la
 * hoja de estilos (y no se vea nunca), que el script reviente donde no hay
 * almacenamiento, o que la lista de lentes del sitio y la del sistema de
 * noticias dejen de ser la misma.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');

describe('qué lente le toca a un lector', () => {
  test('el enlace manda sobre lo guardado, y lo guardado sobre la de por defecto', () => {
    assert.equal(resolverLente({}), LENTE_POR_DEFECTO);
    assert.equal(resolverLente({ guardada: 'tecnologia' }), 'tecnologia');
    assert.equal(resolverLente({ consulta: 'operaciones', guardada: 'tecnologia' }), 'operaciones');
  });

  test('lo que no es una lente se ignora: el parámetro lo teclea cualquiera', () => {
    assert.equal(resolverLente({ consulta: '<script>', guardada: 'operaciones' }), 'operaciones');
    assert.equal(resolverLente({ consulta: 'Operaciones', guardada: null }), LENTE_POR_DEFECTO);
    assert.equal(resolverLente({ consulta: '', guardada: 'constructor' }), LENTE_POR_DEFECTO);
    assert.ok(!esLente(undefined) && !esLente(3) && !esLente('toString'));
  });

  test('cada lente tiene su etiqueta y su cabecera', () => {
    for (const lente of LENTES) {
      assert.ok(ETIQUETA_DE_LENTE[lente], `${lente} no tiene etiqueta.`);
      assert.match(DESDE_LENTE[lente], /^Qué cambia desde /);
    }
    assert.ok(LENTES.includes(LENTE_POR_DEFECTO));
  });
});

describe('las tres lecturas de un artículo', () => {
  const articulo = (lados: string, modo = 'explorar') => `
## Por qué importa

Texto.

<Comparador etiqueta="Perspectiva empresarial de la noticia" modo="${modo}">
${lados}
</Comparador>

## Qué falta por saber
`;
  const LADOS = `  <Lado titulo="Dirección">
    Una lectura para <strong>quien decide</strong>,
    con **negrita**, \`código\` y un [enlace](https://example.com/a_(b)).
  </Lado>
  <Lado titulo="Operaciones">Otra para quien lo hace funcionar.</Lado>
  <Lado titulo="Tecnología">Y otra para quien lo monta.</Lado>`;

  test('salen del explorador, sin etiquetas y en una línea', () => {
    assert.deepEqual(perspectivasDe(articulo(LADOS)), {
      direccion: 'Una lectura para quien decide, con negrita, código y un enlace.',
      operaciones: 'Otra para quien lo hace funcionar.',
      tecnologia: 'Y otra para quien lo monta.',
    });
  });

  test('con dos, con una vacía o sin explorador no hay lente', () => {
    assert.equal(perspectivasDe(articulo(LADOS.replace(/\s*<Lado titulo="Tecnología">[\s\S]*?<\/Lado>/, ''))), null);
    assert.equal(perspectivasDe(articulo(LADOS.replace('Otra para quien lo hace funcionar.', '  '))), null);
    assert.equal(perspectivasDe('## Por qué importa\n\nSin explorador.'), null);
    // A comparison of two options is not the reader's lens.
    assert.equal(perspectivasDe(articulo(LADOS, 'comparar')), null);
  });

  test('la plantilla del artículo protagonista trae las tres', () => {
    const plantilla = source('content/_templates/noticia-protagonista.mdx');
    const titulos = [...plantilla.matchAll(/<Lado\s+titulo="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(titulos, LENTES.map((lente) => ETIQUETA_DE_LENTE[lente]));
  });

  test('son las mismas tres que exige el sistema de noticias antes de publicar', () => {
    const gate = source('scripts/radar/article-gate.mjs');
    const exigidas = gate.match(/const expectedLenses = \[([^\]]+)\]/)?.[1];
    assert.ok(exigidas, 'article-gate.mjs ya no declara `expectedLenses`.');
    assert.deepEqual(
      [...exigidas.matchAll(/"([^"]+)"/g)].map((m) => m[1]),
      LENTES.map((lente) => ETIQUETA_DE_LENTE[lente]),
    );
  });

  test('lo publicado: cada artículo con explorador da sus tres lecturas', () => {
    // El gate no deja publicar uno sin las tres. Si esto falla, el que se ha
    // quedado atrás es el lector de este módulo, no el artículo.
    for (const post of getArticulosNoticia().filter((p) => p.impacto_interactivo)) {
      const lecturas = perspectivasDe(source(`content/posts/${post.slug}.mdx`));
      assert.ok(lecturas, `${post.slug} tiene explorador y perspectivasDe no lo lee.`);
      for (const lente of LENTES) assert.ok(lecturas[lente].length > 40, `${post.slug}: lectura «${lente}» demasiado corta.`);
    }
  });
});

describe('el script que corre antes de pintar', () => {
  function correr({ consulta = '', guardada = null as string | null, sinAlmacen = false, sinUrl = false } = {}) {
    const atributos: Record<string, string> = {};
    const contexto = {
      location: { search: consulta },
      localStorage: {
        getItem(clave: string) {
          if (sinAlmacen) throw new Error('SecurityError');
          return clave === CLAVE_LENTE ? guardada : null;
        },
      },
      document: { documentElement: { setAttribute: (nombre: string, valor: string) => (atributos[nombre] = valor) } },
      ...(sinUrl ? {} : { URLSearchParams }),
    };
    vm.runInNewContext(SCRIPT_LENTE, contexto);
    return atributos['data-lente'];
  }

  test('deja siempre una lente válida en <html>', () => {
    assert.equal(correr(), LENTE_POR_DEFECTO);
    assert.equal(correr({ guardada: 'tecnologia' }), 'tecnologia');
    assert.equal(correr({ consulta: '?lente=operaciones', guardada: 'tecnologia' }), 'operaciones');
    assert.equal(correr({ consulta: '?utm_source=x&lente=tecnologia' }), 'tecnologia');
    assert.equal(correr({ consulta: '?lente=%3Cscript%3E', guardada: 'operaciones' }), 'operaciones');
    assert.equal(correr({ consulta: '?lente=nada', guardada: 'tampoco' }), LENTE_POR_DEFECTO);
  });

  test('sin almacenamiento o sin URLSearchParams no revienta', () => {
    assert.equal(correr({ sinAlmacen: true }), LENTE_POR_DEFECTO);
    assert.equal(correr({ sinAlmacen: true, consulta: '?lente=operaciones' }), 'operaciones');
    assert.equal(correr({ sinUrl: true, guardada: 'tecnologia' }), 'tecnologia');
  });

  test('decide igual que resolverLente', () => {
    const valores = [null, '', 'direccion', 'operaciones', 'tecnologia', 'otra'];
    for (const consulta of valores) {
      for (const guardada of valores) {
        assert.equal(
          correr({ consulta: consulta === null ? '' : `?lente=${consulta}`, guardada }),
          resolverLente({ consulta, guardada }),
          `consulta=${consulta} guardada=${guardada}`,
        );
      }
    }
  });

  test('va en el layout, antes de todo lo que cambia, y <html> lo admite sin aviso', () => {
    const layout = source('src/app/layout.tsx');
    const cuerpo = layout.slice(layout.indexOf('<body'));
    assert.match(cuerpo, /<script dangerouslySetInnerHTML=\{\{ __html: SCRIPT_LENTE \}\} \/>/);
    assert.ok(cuerpo.indexOf('SCRIPT_LENTE') < cuerpo.indexOf('<MotionProvider>'), 'el script va lo primero dentro de <body>.');
    assert.match(layout.slice(layout.indexOf('<html'), layout.indexOf('<body')), /suppressHydrationWarning/);
  });
});

describe('la hoja de estilos conoce cada lente', () => {
  const css = source('src/app/globals.css');
  const reglas = css.slice(css.indexOf("The reader's lens"));

  test('cada lente enseña su lectura y enciende su opción', () => {
    for (const lente of LENTES) {
      assert.ok(
        reglas.includes(`html[data-lente="${lente}"]`) &&
          reglas.includes(`.lente-lectura[data-lente-de="${lente}"]`),
        `Falta la regla que enseña la lectura «${lente}».`,
      );
      assert.ok(
        reglas.includes(`html[data-lente="${lente}"] .lente-radio[value="${lente}"] + .lente-etiqueta`),
        `Falta la regla que enciende la opción «${lente}».`,
      );
    }
  });

  test('sin JavaScript se ve la de por defecto, y solo esa', () => {
    assert.match(reglas, /\.lente-lectura \{\s*display: none;/);
    assert.ok(
      reglas.includes(`html:not([data-lente]):not(:has(.lente-radio:checked:not([value="${LENTE_POR_DEFECTO}"])))`),
      'La lectura por defecto ya no se ve sin el atributo.',
    );
    assert.ok(reglas.includes(`html:not([data-lente]) .lente-lectura[data-lente-de="${LENTE_POR_DEFECTO}"]`));
  });

  test('el selector usa los nombres que leen el script y la hoja de estilos', () => {
    const selector = source('src/components/portada/lente-selector.tsx');
    assert.match(selector, /name=\{CLAVE_LENTE\}/);
    assert.match(selector, /className="lente-radio sr-only"/);
    assert.match(selector, /className="lente-etiqueta /);
    // La lente vive junto a la noticia protagonista de /noticias desde que la
    // home pasó a ser el mapa de puertas (2026-10-14).
    assert.match(source('src/app/noticias/page.tsx'), /className="lente-lectura" data-lente-de=\{lente\}/);
  });
});
