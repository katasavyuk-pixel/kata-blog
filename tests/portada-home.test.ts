import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sitemap from '@/app/sitemap';
import { hasOwnSignupForm, navLinks, siteConfig } from '@/config/site';
import { RUTA_POR_ESTANTE, type Estante } from '@/config/taxonomy';
import type { Perspectivas } from '@/lib/impacto';
import {
  DIAS_AL_DIA,
  MAX_BREVES,
  MAX_LECTURAS,
  MAX_SISTEMAS,
  MAX_TRIADAS,
  MINIMOS,
  construirPortada,
  type Breve,
} from '@/lib/portada-home';
import { leerPortada } from '@/lib/portada-lectura';
import { tienePaginaViva } from '@/lib/posts';

/**
 * La portada: qué enseña con lo publicado, y qué se calla.
 *
 * Cuatro rediseños retirados tenían secciones que existían antes que su
 * contenido. Aquí cada bloque sale de lo publicado y, sin nada real que poner,
 * no existe: ni lista vacía ni título. Lo que se prueba es eso, las reglas de
 * la tríada (que es lo que ata las tres zonas) y la condición con la que esta
 * página es la home: que no le falte nada. Si se pierde la tríada o una zona
 * baja de su mínimo, la build falla aquí en vez de publicar una portada hueca.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');

type Post = {
  slug: string;
  permalink: string;
  title: string;
  description: string;
  date: string;
  protagonista?: boolean;
  fuente?: string;
};
type Item = { id: string };

const post = (slug: string, date: string, over: Partial<Post> = {}): Post => ({
  slug,
  permalink: `/blog/${slug}`,
  title: slug,
  description: '',
  date,
  ...over,
});

const LECTURAS: Perspectivas = { direccion: 'D', operaciones: 'O', tecnologia: 'T' };
const breve = (n: number): Breve => ({ url: `https://example.com/${n}`, titular: `Breve ${n}`, medio: 'Medio', eje: 'ia' });

const HOY = '2026-10-14T09:00:00.000Z';

function portada(over: Partial<Parameters<typeof construirPortada<Post, Item, Item, { issue: string }>>[0]> = {}) {
  return construirPortada<Post, Item, Item, { issue: string }>({
    noticias: [],
    reflexiones: [],
    guias: [],
    sistemas: [],
    activos: [],
    destacados: [],
    semanas: [],
    breves: () => [],
    lecturas: () => null,
    fuenteDe: (articulo) => articulo.fuente,
    relaciones: () => ({ aRaizDe: [], seResuelveCon: [] }),
    hoy: HOY,
    ...over,
  });
}

describe('sin contenido no hay bloque', () => {
  test('un sitio vacío da una portada vacía, y dice qué le falta', () => {
    const vacia = portada();
    assert.equal(vacia.primera, null);
    assert.equal(vacia.breves, null);
    assert.deepEqual(vacia.triadas, []);
    assert.deepEqual(vacia.lecturas, []);
    assert.equal(vacia.taller, null);
    assert.equal(vacia.semana, null);
    assert.equal(vacia.faltan.length, 4);
  });

  test('una edición sin ítems que enseñar no abre el bloque de breves', () => {
    const lead = post('noticia-2026-10-14', '2026-10-14', { protagonista: true, fuente: 'https://example.com/1' });
    const edicion = post('noticias-2026-10-14', '2026-10-14');
    // Its only item is the story the lead article was written from.
    assert.equal(portada({ noticias: [lead, edicion], breves: () => [breve(1)] }).breves, null);
  });

  test('el componente no pinta un título sobre un bloque vacío', () => {
    // Las puertas de la home desde el 2026-10-14: cada una solo con algo dentro.
    const componente = source('src/components/portada/portada.tsx');
    for (const guarda of [
      'primera || breves ? <PuertaNoticias',
      'activos.length > 0 ? (',
      'firmadas.length > 0 ? <PuertaLecturas',
      'PUBLICACIONES_LINKEDIN.length > 0 ? <PuertaLinkedIn',
      'if (!episodio) return null;',
      'primera ? (',
      'breves ? (',
    ]) {
      assert.ok(componente.includes(guarda), `Falta la guarda «${guarda}».`);
    }
  });
});

describe('la noticia del día', () => {
  const lead = post('noticia-2026-10-14', '2026-10-14', { protagonista: true, fuente: 'https://example.com/2' });
  const edicion = post('noticias-2026-10-14', '2026-10-14');

  test('la protagonista lleva sus tres lecturas, o ninguna', () => {
    const con = portada({ noticias: [edicion, lead], lecturas: (articulo) => (articulo === lead ? LECTURAS : null) });
    assert.equal(con.primera?.articulo, lead);
    assert.deepEqual(con.primera?.lecturas, LECTURAS);
    assert.equal(con.primera?.alDia, true);
    assert.equal(portada({ noticias: [edicion, lead] }).primera?.lecturas, null);
  });

  test('deja de ser «de hoy» cuando hay una edición posterior o pasan los días', () => {
    const vieja = post('noticia-2026-10-10', '2026-10-10', { protagonista: true });
    assert.equal(portada({ noticias: [vieja, edicion] }).primera?.alDia, false, 'la edición es posterior al artículo.');
    assert.equal(portada({ noticias: [vieja] }).primera?.alDia, false, `han pasado más de ${DIAS_AL_DIA} días.`);
    assert.equal(portada({ noticias: [lead], hoy: '2026-10-16T00:00:00.000Z' }).primera?.alDia, true);
    assert.equal(portada({ noticias: [lead], hoy: '2026-10-16T12:00:00.000Z' }).primera?.alDia, false);
  });

  test('los breves no repiten la fuente de la protagonista y tienen tope', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8].map(breve);
    const { breves } = portada({ noticias: [lead, edicion], breves: (e) => (e === edicion ? items : []) });
    assert.equal(breves?.edicion, edicion);
    assert.equal(breves?.items.length, MAX_BREVES);
    assert.deepEqual(breves?.items.map((item) => item.titular), ['Breve 1', 'Breve 3', 'Breve 4', 'Breve 5', 'Breve 6']);
  });
});

describe('la tríada', () => {
  const noticia = post('noticias-2026-09-23', '2026-09-23');
  const otraNoticia = post('noticias-2026-10-01', '2026-10-01');
  const conActivo = post('reflexion-con-activo', '2026-09-24');
  const sinActivo = post('reflexion-sin-activo', '2026-10-02');
  const suelta = post('reflexion-suelta', '2026-10-05');
  const deOtraPieza = post('reflexion-sobre-una-nota', '2026-10-06');
  const nota = post('una-nota', '2026-08-01');
  const guia = post('guia-con-activo', '2026-10-03');

  const relaciones = (pieza: Post) => {
    if (pieza === conActivo) return { aRaizDe: [noticia], seResuelveCon: [{ id: 'calculadora' }, { id: 'otro' }] };
    if (pieza === sinActivo) return { aRaizDe: [otraNoticia], seResuelveCon: [] };
    if (pieza === deOtraPieza) return { aRaizDe: [nota], seResuelveCon: [{ id: 'calculadora' }] };
    if (pieza === guia) return { aRaizDe: [], seResuelveCon: [{ id: 'calculadora' }] };
    return { aRaizDe: [], seResuelveCon: [] };
  };
  const base = { noticias: [noticia, otraNoticia], reflexiones: [deOtraPieza, suelta, sinActivo, conActivo], guias: [guia], relaciones };

  test('nace de una noticia; la completa lo que la resuelve, y las completas van primero', () => {
    const { triadas } = portada(base);
    assert.deepEqual(
      triadas.map((t) => [t.noticia.slug, t.pieza.slug, t.activo?.id ?? null]),
      [
        ['noticias-2026-09-23', 'reflexion-con-activo', 'calculadora'],
        ['noticias-2026-10-01', 'reflexion-sin-activo', null],
      ],
    );
  });

  test('una pieza que cita otra cosa que no es una noticia, o que solo nombra un activo, no es una tríada', () => {
    const slugs = portada(base).triadas.map((t) => t.pieza.slug);
    assert.ok(!slugs.includes('reflexion-sobre-una-nota'));
    assert.ok(!slugs.includes('guia-con-activo'));
  });

  test('hay un tope, y lo que ya está en una tríada no se repite debajo', () => {
    const muchas = [1, 2, 3, 4].map((n) => post(`r${n}`, `2026-10-0${n}`));
    const todas = portada({
      noticias: [noticia],
      reflexiones: muchas,
      relaciones: () => ({ aRaizDe: [noticia], seResuelveCon: [] }),
    });
    assert.equal(todas.triadas.length, MAX_TRIADAS);
    const enTriada = new Set(todas.triadas.map((t) => t.pieza.slug));
    assert.ok(todas.lecturas.every((p) => !enTriada.has(p.slug)));
    assert.equal(todas.lecturas.length, muchas.length - MAX_TRIADAS);
  });

  test('las lecturas mezclan reflexiones y guías por fecha, con tope', () => {
    const { lecturas } = portada(base);
    assert.deepEqual(
      lecturas.map((p) => p.slug),
      ['reflexion-sobre-una-nota', 'reflexion-suelta', 'guia-con-activo'],
    );
    assert.equal(lecturas.length, MAX_LECTURAS);
  });
});

describe('el taller y la semana', () => {
  test('existe con activos o con sistemas, y enseña una muestra', () => {
    const sistemas = [1, 2, 3].map((n) => post(`sistema-${n}`, `2026-09-0${n}`));
    const activos = [1, 2, 3, 4].map((n) => ({ id: `a${n}` }));
    const taller = portada({ sistemas, activos, destacados: activos.slice(0, 2) }).taller;
    assert.deepEqual(taller?.activos, activos.slice(0, 2));
    assert.equal(taller?.totalActivos, 4);
    assert.equal(taller?.sistemas.length, MAX_SISTEMAS);
    assert.equal(taller?.totalSistemas, 3);
    assert.ok(portada({ sistemas }).taller);
    assert.ok(portada({ activos }).taller);
  });

  test('la semana es la última enviada', () => {
    assert.deepEqual(portada({ semanas: [{ issue: '2026-s43' }, { issue: '2026-s42' }] }).semana, { issue: '2026-s43' });
  });
});

describe('qué le falta para ser la home', () => {
  const noticia = post('noticias-2026-10-14', '2026-10-14');
  const reflexiones = [1, 2, 3].map((n) => post(`r${n}`, `2026-10-0${n}`));
  const completa = {
    noticias: [noticia],
    reflexiones,
    activos: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    relaciones: (pieza: Post) =>
      pieza === reflexiones[0] ? { aRaizDe: [noticia], seResuelveCon: [{ id: 'a' }] } : { aRaizDe: [], seResuelveCon: [] },
  };

  test('con una tríada completa, el mínimo por zona y noticias al día, nada', () => {
    assert.deepEqual(portada(completa).faltan, []);
    assert.deepEqual(MINIMOS, { triadas: 1, reflexiones: 3, activos: 3 });
  });

  test('cada condición que deja de cumplirse aparece, y solo esa', () => {
    const sinActivo = portada({ ...completa, relaciones: () => ({ aRaizDe: [noticia], seResuelveCon: [] }) }).faltan;
    assert.equal(sinActivo.length, 1);
    assert.match(sinActivo[0], /^Una tríada completa.*3 piezas enlazadas a una noticia y 0 con las tres partes\.$/);

    assert.deepEqual(portada({ ...completa, reflexiones: reflexiones.slice(0, 1) }).faltan, ['Reflexiones: 1 de 3.']);
    assert.deepEqual(portada({ ...completa, activos: [{ id: 'a' }] }).faltan, ['Activos instalables en el catálogo: 1 de 3.']);

    assert.deepEqual(portada({ ...completa, noticias: [] }).faltan.slice(-1), ['Noticias: no hay ninguna edición publicada.']);
  });

  test('que las noticias sean de hoy no es condición: cambia con el reloj y la página ya lo dice', () => {
    const meses = portada({ ...completa, hoy: '2027-03-01T00:00:00.000Z' });
    assert.deepEqual(meses.faltan, []);
    assert.equal(meses.breves, null, 'la edición de prueba no trae ítems.');
    const conItems = portada({ ...completa, breves: () => [breve(1)], hoy: '2027-03-01T00:00:00.000Z' });
    assert.equal(conItems.breves?.alDia, false);
  });
});

describe('la home es la portada', () => {
  const pagina = source('src/app/page.tsx');
  const componente = source('src/components/portada/portada.tsx');

  test('mientras no le falte nada: una tríada completa y el mínimo de cada zona', () => {
    // La condición de la fase 9. Si falla, lo publicado ya no sostiene esta
    // portada: o vuelve lo que falta, o la home deja de ser esta página.
    assert.deepEqual(leerPortada(HOY).faltan, []);
  });

  test('se lee sin errores y no enseña la misma pieza dos veces', () => {
    const real = leerPortada(HOY);
    const enTriada = real.triadas.map((t) => t.pieza.slug);
    const debajo = real.lecturas.map((p) => p.slug);
    assert.equal(new Set([...enTriada, ...debajo]).size, enTriada.length + debajo.length);
    if (real.primera && real.breves) {
      assert.ok(real.breves.items.every((item) => item.url !== real.primera?.articulo.fuente_url));
    }
    assert.ok(real.triadas[0]?.activo, 'la primera tríada tiene que ser una completa.');
  });

  test('la página es el hero y la portada, con su canónica y sus datos de autor', () => {
    assert.match(pagina, /<Portada portada=\{leerPortada\(\)\} cabecera=\{<Hero \/>\} \/>/);
    assert.match(pagina, /<JsonLd data=\{\[websiteJsonLd\(\), personJsonLd\(\)\]\} \/>/);
    assert.match(pagina, /canonical: "\/"/);
    assert.doesNotMatch(componente, /<SubscribeForm|<Hero\b|<h1\b/, 'la promesa y el formulario los pone el hero, una vez.');
    assert.ok(hasOwnSignupForm('/'));
  });

  test('revalida cada hora, así que nada de lo que pinta abre un fichero', () => {
    assert.match(pagina, /export const revalidate = 3600;/);
    // En una revalidación content/posts puede no estar, y una lectura que
    // falla en silencio dejaría la home sin breves ni lecturas.
    for (const fichero of ['src/lib/portada-lectura.ts', 'src/lib/portada-home.ts', 'src/lib/medios.ts', 'src/lib/impacto.ts', 'src/components/portada/portada.tsx']) {
      assert.doesNotMatch(source(fichero), /from "node:(fs|path)"|readFileSync|process\.cwd\(\)/, `${fichero} lee del disco.`);
    }
    const velite = source('velite.config.ts');
    assert.match(velite, /novedades: automatico && !data\.protagonista \? parseNovedades\(raw\) : \[\]/);
    assert.match(velite, /lecturas: automatico && data\.protagonista \? perspectivasDe\(raw\) : null/);
    assert.match(velite, /\.transform\(\(\{ raw, \.\.\.data \}\) =>/, 'el texto fuente no debe viajar en la colección.');
  });

  test('el prototipo se fue con la sustitución', () => {
    const urls = sitemap().map((entry) => entry.url);
    assert.ok(!urls.some((url) => url.startsWith(`${siteConfig.url}/portada`)));
    assert.doesNotMatch(componente, /tratamiento|NotaDePrototipo/);
    assert.ok(!hasOwnSignupForm('/portada') && !hasOwnSignupForm('/portada/b'));
  });

  test('la navegación empieza por las noticias y no lleva a un estante vacío', () => {
    assert.equal(navLinks[0].href, '/noticias');
    const hrefs: string[] = navLinks.map((link) => link.href);
    for (const [estante, ruta] of Object.entries(RUTA_POR_ESTANTE) as [Estante, string][]) {
      if (ruta !== '/blog' && hrefs.includes(ruta)) {
        assert.ok(tienePaginaViva(estante), `la navegación enlaza ${ruta}, que hoy responde 404.`);
      }
    }
  });
});
