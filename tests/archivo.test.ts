import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ESTANTE_POR_FORMATO, type Estante, type Formato, type Tema } from '@/config/taxonomy';
import { TIPOS_DE_ARCHIVO, facetas, filtrar, hrefDeArchivo, leerFiltro } from '@/lib/archivo';
import { estanteDe, getEditoriales } from '@/lib/posts';

/**
 * El archivo como un solo flujo: cada pieza dice qué es, y se estrecha por
 * tipo, por tema o buscando.
 *
 * Los filtros son enlaces con parámetros que escribe cualquiera, así que lo que
 * se prueba es que un parámetro que no existe no rompa ni vacíe la página, que
 * una opción no se ofrezca si no deja nada, y que cada combinación tenga una
 * sola dirección.
 */
const root = fileURLToPath(new URL('..', import.meta.url));

type Pieza = { title: string; description: string; dek?: string; tema: Tema; formato: Formato; tags: string[] };
const pieza = (title: string, formato: Formato, tema: Tema, over: Partial<Pieza> = {}): Pieza => ({
  title,
  description: '',
  tema,
  formato,
  tags: [],
  ...over,
});
const tipoDe = (p: Pieza): Estante => ESTANTE_POR_FORMATO[p.formato];

const PIEZAS = [
  pieza('Un sistema de captación', 'sistema', 'captacion'),
  pieza('Un caso real', 'caso', 'operaciones'),
  pieza('Una reflexión', 'reflexion', 'ia-aplicada', { dek: 'Sobre el precio de los modelos.' }),
  pieza('Otra reflexión', 'reflexion', 'captacion', { tags: ['llamadas'] }),
  pieza('Una guía de costes', 'guia', 'economia', { description: 'Cuánto cuesta un agente.' }),
];

describe('lo que pide la dirección', () => {
  test('tipo y tema solo valen si nombran algo que existe', () => {
    assert.deepEqual(leerFiltro({ tipo: 'reflexiones', tema: 'captacion', q: ' llamadas ' }), {
      tipo: 'reflexiones',
      tema: 'captacion',
      q: 'llamadas',
    });
    assert.deepEqual(leerFiltro({ tipo: 'inventado', tema: 'nope' }), { q: '' });
    assert.deepEqual(leerFiltro({ tipo: ['guias', 'sistemas'], tema: [] }), { tipo: 'guias', q: '' });
    assert.deepEqual(leerFiltro({}), { q: '' });
  });

  test('las noticias no son un tipo del archivo', () => {
    assert.ok(!(TIPOS_DE_ARCHIVO as readonly string[]).includes('noticias'));
    assert.deepEqual(leerFiltro({ tipo: 'noticias' }), { q: '' });
  });

  test('un enlace antiguo con ?estante= filtra igual; ?tipo= manda si vienen los dos', () => {
    assert.deepEqual(leerFiltro({ estante: 'sistemas' }), { tipo: 'sistemas', q: '' });
    assert.deepEqual(leerFiltro({ estante: 'sistemas', tipo: 'guias' }), { tipo: 'guias', q: '' });
  });

  test('la búsqueda se recorta', () => {
    assert.equal(leerFiltro({ q: 'x'.repeat(500) }).q.length, 80);
  });
});

describe('lo que deja un filtro', () => {
  test('tipo es el estante: un caso real es un sistema', () => {
    assert.deepEqual(
      filtrar(PIEZAS, { tipo: 'sistemas', q: '' }, tipoDe).map((p) => p.title),
      ['Un sistema de captación', 'Un caso real'],
    );
  });

  test('tipo, tema y búsqueda se suman', () => {
    assert.deepEqual(
      filtrar(PIEZAS, { tipo: 'reflexiones', tema: 'captacion', q: '' }, tipoDe).map((p) => p.title),
      ['Otra reflexión'],
    );
    assert.deepEqual(filtrar(PIEZAS, { tipo: 'guias', tema: 'captacion', q: '' }, tipoDe), []);
  });

  test('la búsqueda mira título, descripción, entradilla y etiquetas, sin acentos ni mayúsculas', () => {
    const buscar = (q: string) => filtrar(PIEZAS, { q }, tipoDe).map((p) => p.title);
    assert.deepEqual(buscar('REFLEXION'), ['Una reflexión', 'Otra reflexión']);
    assert.deepEqual(buscar('cuánto cuesta'), ['Una guía de costes']);
    assert.deepEqual(buscar('precio'), ['Una reflexión']);
    assert.deepEqual(buscar('llamadas'), ['Otra reflexión']);
    assert.deepEqual(buscar('nada de esto'), []);
  });
});

describe('las opciones que se ofrecen', () => {
  test('cada opción dice cuántas piezas dejaría, contando el otro filtro', () => {
    const { tipos, temas } = facetas(PIEZAS, { tema: 'captacion', q: '' }, tipoDe);
    assert.deepEqual(
      tipos.map((t) => [t.clave, t.n]),
      [
        ['sistemas', 1],
        ['reflexiones', 1],
      ],
    );
    // The theme options ignore the selected theme itself: they are its alternatives.
    assert.deepEqual(
      temas.map((t) => [t.clave, t.n, t.activa]),
      [
        ['ia-aplicada', 1, false],
        ['captacion', 2, true],
        ['operaciones', 1, false],
        ['economia', 1, false],
      ],
    );
  });

  test('lo que no dejaría nada no se ofrece, salvo que sea lo elegido', () => {
    const { tipos } = facetas(PIEZAS, { tipo: 'guias', tema: 'captacion', q: '' }, tipoDe);
    assert.deepEqual(
      tipos.map((t) => [t.clave, t.n, t.activa]),
      [
        ['sistemas', 1, false],
        ['guias', 0, true],
        ['reflexiones', 1, false],
      ],
    );
  });
});

describe('una dirección por combinación', () => {
  test('siempre en el mismo orden y aterriza en la lista', () => {
    assert.equal(hrefDeArchivo({}), '/blog#archivo');
    assert.equal(hrefDeArchivo({ q: 'geo', tema: 'captacion', tipo: 'sistemas' }), '/blog?tipo=sistemas&tema=captacion&q=geo#archivo');
    assert.equal(hrefDeArchivo({ q: 'a b&c' }), '/blog?q=a+b%26c#archivo');
  });

  test('lo que escribe una dirección es lo que lee', () => {
    for (const filtro of [{ tipo: 'curso', q: '' }, { tema: 'economia', q: 'coste real' }, { tipo: 'notas', tema: 'operaciones', q: 'ñ' }] as const) {
      const url = new URL(hrefDeArchivo(filtro), 'https://example.com');
      assert.deepEqual(leerFiltro(Object.fromEntries(url.searchParams)), filtro);
    }
  });
});

describe('la página, con lo publicado', () => {
  const pagina = readFileSync(join(root, 'src/app/blog/page.tsx'), 'utf8');

  test('todo lo escrito a mano cabe en algún tipo', () => {
    const archivo = getEditoriales();
    const { tipos } = facetas(archivo, { q: '' }, estanteDe);
    assert.equal(tipos.reduce((suma, tipo) => suma + tipo.n, 0), archivo.length);
    assert.equal(filtrar(archivo, { q: '' }, estanteDe).length, archivo.length);
  });

  test('es una sola página para un buscador y los filtros son enlaces', () => {
    assert.match(pagina, /canonical: "\/blog"/);
    assert.match(pagina, /href=\{hrefDeArchivo\(\{ \.\.\.filtro, tipo: tipo\.activa \? undefined : tipo\.clave \}\)\}/);
    assert.match(pagina, /href=\{hrefDeArchivo\(\{ \.\.\.filtro, tema: tema\.activa \? undefined : tema\.clave \}\)\}/);
    assert.match(pagina, /<FlujoRow key=\{post\.slug\} post=\{post\} \/>/);
    assert.doesNotMatch(pagina, /"use client"/);
  });

  test('las noticias siguen fuera: se enlazan, no se listan', () => {
    assert.match(pagina, /getEditoriales\(\)/);
    assert.match(pagina, /href="\/noticias"/);
  });
});
