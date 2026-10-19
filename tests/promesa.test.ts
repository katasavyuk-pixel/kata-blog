import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { siteConfig } from '@/config/site';
import { esBorradorSemanal } from '@/lib/semanal';

/**
 * Una sola promesa en todo el sitio.
 *
 * El 5-oct-2026 convivían tres: la home hablaba a «personas curiosas», la
 * bienvenida y la FAQ prometían «un sistema cada dos semanas» y el pie de los
 * artículos otra cosa. Ninguna estaba mal escrita; el fallo era que cada
 * rediseño cambiaba una y dejaba las demás. Este test es lo que impide que
 * vuelva a pasar: una promesa retirada que reaparece rompe la build.
 *
 * Las piezas automáticas de noticias quedan fuera: citan titulares ajenos. Eso
 * incluye el artículo protagonista (`noticia-AAAA-MM-DD`), que lo escribe el
 * mismo sistema: sin excluirlo, una palabra de la lista de VOZ.md en un texto
 * que nadie ha revisado rompería `npm run verify` en el siguiente commit humano.
 *
 * Por lo mismo queda fuera el borrador de la edición semanal mientras lleve
 * `draft: true`: son titulares de las fuentes, algunos en inglés. En cuanto
 * Kata quita el `draft`, el texto es suyo y entra aquí como cualquier otro.
 */
const root = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Comments quote the rules they enforce; only shipped strings count. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const FILES = [
  ...walk(join(root, 'src')).filter((f) => /\.(ts|tsx)$/.test(f)),
  ...walk(join(root, 'content/emails')),
  ...walk(join(root, 'content/newsletters')).filter((f) => !esBorradorSemanal(readFileSync(f, 'utf8'))),
  ...walk(join(root, 'content/posts')).filter((f) => !/\/(noticias|noticia|radar)-[^/]+\.mdx$/.test(f)),
].map((path) => ({
  file: relative(root, path),
  text: /\.(ts|tsx)$/.test(path) ? withoutComments(readFileSync(path, 'utf8')) : readFileSync(path, 'utf8'),
}));

const PROMESAS_RETIRADAS: [RegExp, string][] = [
  [/Historias, ideas y experimentos/i, 'promesa del 4-oct-2026 («historias, ideas y experimentos»)'],
  [/curiosas por la IA/i, 'audiencia del 4-oct-2026 («personas curiosas»)'],
  [/lectura para volver|publicación para volver/i, 'newsletter del 4-oct-2026 («una lectura para volver»)'],
  [/Sistemas probados en un negocio real/i, 'tagline de julio de 2026'],
  [/Sistemas replicables/i, 'promesa de julio de 2026 («sistemas replicables»)'],
  [/cada dos semanas/i, 'cadencia hasta el 16-oct-2026 («como mucho, cada dos semanas»): desde entonces, una a la semana'],
];

// VOZ.md §«Palabras prohibidas».
const LEXICO_PROHIBIDO =
  /\b(potenciar|desbloquear|revolucionar|empoderar|sinergias?|paradigmas?|disruptiv[oa]s?|sum[eé]rgete|unlock|empower|seamless)\b|¿Sabías que|etiqueta a un amigo/i;

describe('una sola promesa', () => {
  test('ninguna promesa retirada sigue publicada', () => {
    for (const { file, text } of FILES) {
      for (const [pattern, cual] of PROMESAS_RETIRADAS) {
        assert.doesNotMatch(text, pattern, `${file} todavía lleva la ${cual}.`);
      }
    }
  });

  test('la cadencia es un techo («como mucho»), nunca un compromiso fijo', () => {
    for (const { file, text } of FILES) {
      for (const match of text.matchAll(/(un correo|uno|una vez) a la semana/gi)) {
        const antes = text.slice(Math.max(0, match.index - 40), match.index);
        assert.match(antes, /como mucho/i, `${file} promete «${match[0]}» sin el «como mucho».`);
      }
    }
  });

  test('ningún texto usa el léxico prohibido de VOZ.md', () => {
    for (const { file, text } of FILES) {
      assert.doesNotMatch(text, LEXICO_PROHIBIDO, `${file} usa una palabra de la lista prohibida de VOZ.md.`);
    }
  });

  test('la home, el pie y la bienvenida dicen lo mismo', () => {
    assert.match(siteConfig.tagline, /^Sistemas de IA que ya funcionan en un negocio real\./);
    // Desde el 2026-10-14 la home abre con lo que el lector puede hacer
    // (siteConfig.home.titular) y la promesa vive en /sobre-mi, con el retrato.
    const hero = readFileSync(`${root}src/components/home/hero.tsx`, 'utf8');
    assert.match(hero, /\{siteConfig\.home\.titular\}/, 'El h1 de la home ya no sale de siteConfig.home.titular.');
    const sobreMi = readFileSync(`${root}src/app/sobre-mi/page.tsx`, 'utf8');
    assert.match(sobreMi, /\{siteConfig\.tagline\}/, 'La promesa ya no está en /sobre-mi.');
    const bienvenida = readFileSync(`${root}content/emails/01-bienvenida.md`, 'utf8');
    for (const pieza of ['sus números', 'se rompió', 'Como mucho, un correo a la semana']) {
      assert.ok(siteConfig.newsletter.description.includes(pieza) || siteConfig.newsletter.magnet.includes(pieza), `siteConfig.newsletter perdió «${pieza}».`);
      assert.ok(bienvenida.includes(pieza), `El email de bienvenida perdió «${pieza}».`);
    }
  });
});
