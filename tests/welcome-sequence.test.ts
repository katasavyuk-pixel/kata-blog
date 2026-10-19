import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * La secuencia de bienvenida, comprobada en su fuente.
 *
 * `welcome-sequence.tsx` no es testeable en unidad: lee los pasos de Velite
 * (`#site/content`, que solo existe tras `velite build`) y lleva JSX, que el
 * modo strip-types de Node no transforma. Pero la decisión de negocio no vive
 * en ese fichero: vive en el frontmatter de content/emails/.
 *
 * Se fija aquí porque el 2026-08-05 la secuencia pasó de día 2/5/8 a 0h/48h/96h
 * por tres razones — la primera, que quien
 * confirmaba recibía un "bienvenido" vacío y el primer contenido real dos días
 * después. Sin este test, una edición futura puede volver atrás sin que nada
 * se entere hasta que un suscriptor lo note.
 */

const DIR = join(import.meta.dirname, '..', 'content', 'emails');

interface Paso {
  fichero: string;
  key: string;
  sequence: string;
  order: number;
  delayHours: number;
  subject: string;
  draft: boolean;
}

function leerFrontmatter(fichero: string): Paso {
  const bruto = readFileSync(join(DIR, fichero), 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(bruto);
  assert.ok(m, `${fichero} no tiene frontmatter`);
  const campos: Record<string, string> = {};
  for (const linea of m[1]!.split('\n')) {
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(linea.trim());
    if (kv) campos[kv[1]!] = kv[2]!.replace(/^["']|["']$/g, '').trim();
  }
  return {
    fichero,
    key: campos.key ?? '',
    sequence: campos.sequence ?? '',
    order: Number(campos.order),
    delayHours: Number(campos.delayHours),
    subject: campos.subject ?? '',
    draft: campos.draft === 'true',
  };
}

const pasos = readdirSync(DIR)
  .filter((f) => f.endsWith('.md'))
  .map(leerFrontmatter)
  .filter((p) => p.sequence === 'bienvenida' && !p.draft)
  .sort((a, b) => a.order - b.order);

describe('secuencia de bienvenida', () => {
  test('son tres pasos', () => {
    assert.equal(pasos.length, 3, 'la secuencia decidida tiene tres emails');
  });

  // EL DATO QUE SE FIJA: "0 h entrega · 48 h historia · 96 h sistema".
  test('la temporización es 0h / 48h / 96h', () => {
    assert.deepEqual(
      pasos.map((p) => p.delayHours),
      [0, 48, 96],
      'volver a 2/5/8 días reintroduce el hueco de dos días sin nada útil',
    );
  });

  test('el primer email sale inmediato y entrega lo prometido', () => {
    assert.equal(pasos[0]!.delayHours, 0, 'confirmar sin recibir nada es el fallo que se corrigió');
  });

  test('la secuencia entera cabe en cuatro días', () => {
    const ultimo = pasos.at(-1)!.delayHours;
    assert.ok(ultimo <= 96, `${ultimo}h son más de 4 días: quien se suscribe en viernes espera dos semanas de calendario`);
  });

  test('cada paso tiene key única: es lo que ata el envío a scheduled_emails', () => {
    const keys = pasos.map((p) => p.key);
    assert.equal(new Set(keys).size, keys.length, `keys duplicadas: ${keys.join(', ')}`);
    for (const p of pasos) assert.ok(p.key.length > 0, `${p.fichero} sin key`);
  });

  test('el orden es consecutivo desde 1', () => {
    assert.deepEqual(pasos.map((p) => p.order), [1, 2, 3]);
  });

  test('cada paso tiene asunto', () => {
    for (const p of pasos) {
      assert.ok(p.subject.length > 0, `${p.fichero} sin subject`);
      assert.ok(p.subject.length <= 90, `${p.fichero}: asunto de ${p.subject.length} chars, se corta en el móvil`);
    }
  });

  // La voz es en singular: escribe una persona, no una empresa. El email del
  // día 8 decía "montamos sistemas de IA" y se corrigió; esto impide que vuelva.
  test('ningún email usa el plural de empresa', () => {
    const prohibido = /\b(montamos|construimos|desarrollamos|ofrecemos|somos una|nuestra empresa)\b/i;
    for (const p of pasos) {
      const cuerpo = readFileSync(join(DIR, p.fichero), 'utf8');
      const hit = prohibido.exec(cuerpo);
      assert.equal(hit, null, `${p.fichero} usa "${hit?.[0]}" — la voz del sitio es en singular`);
    }
  });
});
