import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { footerLinks, hasOwnSignupForm, navLinks } from '@/config/site';
import { COURSE_SLUGS } from '@/config/course';
import { allPosts, getEditoriales, getNoticias, getPostsByEstante } from '@/lib/posts';

/**
 * La arquitectura de información, comprobada donde se puede romper sin ruido.
 *
 * La navegación sale de `formato` (src/config/taxonomy.ts). Tres cosas pueden
 * desalinearse sin que falle nada más: una edición automática que llega con
 * otro formato y se cuela en el archivo, una lección que no está en el curso,
 * y una página que estrena formulario propio mientras el pie sigue pintando el
 * suyo. Las tres tienen aquí su test.
 *
 * Importa `#site/content` a través de `@/lib/posts`: hace falta
 * `npm run build:content` antes, igual que en newsletter-archive.test.ts.
 */
const root = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('estantes', () => {
  test('el archivo no lleva noticias y las noticias no llevan otra cosa', () => {
    assert.equal(getEditoriales().length + getNoticias().length, allPosts.length);
    for (const post of getEditoriales()) {
      assert.notEqual(post.formato, 'radar');
      // El bot nombra así sus ficheros: si uno aparece aquí, llegó con otro formato.
      assert.doesNotMatch(post.slug, /^(noticias|noticia|radar)-\d{4}-\d{2}-\d{2}$/, `${post.slug} es una edición automática fuera de Noticias.`);
    }
    for (const post of getNoticias()) {
      // `noticia-` es el artículo protagonista; `noticias-`/`radar-`, la edición breve.
      assert.match(post.slug, /^(noticias|noticia|radar)-\d{4}-\d{2}-\d{2}$/, `${post.slug} tiene formato «radar» y no es una edición ni un artículo de Noticias.`);
      assert.equal(post.protagonista, post.slug.startsWith('noticia-'), `${post.slug}: «protagonista» y el prefijo del slug no coinciden.`);
    }
  });

  test('una lección es una pieza del curso, y al revés', () => {
    const enEstante = getPostsByEstante('curso').map((post) => post.slug).sort();
    assert.deepEqual(enEstante, [...COURSE_SLUGS].sort());
  });

  test('la navegación son las cuatro puertas de la home y no vende NBI', () => {
    // 2026-10-14: la home es el mapa de lo que el lector puede hacer, y la
    // cabecera repite sus cuatro puertas en su orden. 2026-10-15: «Sobre mí»
    // vuelve a la cabecera, la última, después de lo que el lector viene a hacer,
    // y la Bitácora (lo que construyo, fecha a fecha) entra justo antes.
    assert.deepEqual(navLinks.map((link) => link.label), ['Noticias', 'Marketplace', 'Herramientas', 'Lecturas', 'Bitácora', 'Sobre mí']);
    const hrefs: string[] = navLinks.map((link) => link.href);
    assert.ok(!hrefs.includes('/trabaja-con-nbi'));
  });

  test('la home no vende NBI: su camino es el pie y /trabaja-con-nbi', () => {
    // En la home se ve y se aprende; en NBI se contrata (frontera
    // Kata / NBI). El 11-oct-2026 un bloque «Conocer NBI» volvió al cuerpo de
    // la home dentro de otro cambio. Los comentarios citan la regla: no cuentan.
    // La home y todo lo que pinta: la página, la portada y sus piezas.
    for (const fichero of [
      'src/app/page.tsx',
      'src/components/portada/portada.tsx',
      'src/components/home/hero.tsx',
    ]) {
      const home = readFileSync(join(root, fichero), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      assert.doesNotMatch(home, /\/trabaja-con-nbi/, `${fichero} enlaza /trabaja-con-nbi.`);
      assert.doesNotMatch(home, /Nexora Business Intelligence/, `${fichero} presenta NBI en su cuerpo.`);
    }
    const pie: string[] = footerLinks.map((link) => link.href);
    assert.ok(pie.includes('/trabaja-con-nbi'), 'NBI se quedó sin camino: tampoco está en el pie.');
  });
});

describe('un formulario de alta por página', () => {
  // Lo que pinta un formulario de alta dentro de una página. `Hero` es la
  // cabecera de la home (promesa + formulario en una sección, fase 3).
  const CON_FORMULARIO = /<(SubscribeForm|Hero|ArticleClosing)\b/;

  /** src/app/blog/[slug]/page.tsx → /blog/x */
  function rutaDe(file: string): string {
    const ruta = relative(join(root, 'src/app'), file)
      .replace(/(^|\/)page\.tsx$/, '')
      .replace(/\[[^\]]+\]/g, 'x');
    return `/${ruta}`;
  }

  test('el pie calla donde la página ya tiene el suyo, y solo ahí', () => {
    const paginas = walk(join(root, 'src/app')).filter((f) => f.endsWith('page.tsx'));
    for (const file of paginas) {
      const propio = CON_FORMULARIO.test(readFileSync(file, 'utf8'));
      const ruta = rutaDe(file);
      assert.equal(
        hasOwnSignupForm(ruta),
        propio,
        propio
          ? `${ruta} tiene formulario propio y el pie pintaría otro: añádela a hasOwnSignupForm.`
          : `${ruta} está en hasOwnSignupForm y no pinta formulario: se quedaría sin ninguno.`,
      );
    }
  });
});
