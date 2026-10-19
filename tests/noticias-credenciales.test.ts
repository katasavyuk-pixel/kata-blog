import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { secretFindings } from '../scripts/radar/no-secrets.mjs';

/**
 * Lo que escribe el modelo se publica solo. Antes de salir, se comprueba que no
 * lleva dentro ninguna credencial del job: es la única puerta por la que un
 * texto malicioso en un feed podría sacar algo.
 *
 * Los valores de aquí son inventados; ninguno es una credencial real.
 */

const ROOT = join(import.meta.dirname, '..');
const SCRIPT = join(ROOT, 'scripts/radar/no-secrets.mjs');
const FALSA = 'sk-ant-oat01-' + 'Zx9'.repeat(14);
const secretos = { CLAUDE_CODE_OAUTH_TOKEN: FALSA };
const edicion = (dentro: string) => `---\ntitle: "Noticias"\n---\n\n<RadarItem url="https://ejemplo.test/a">\n\n${dentro}\n\n</RadarItem>\n`;

describe('credenciales en lo que se va a publicar', () => {
  test('una edición normal pasa', () => {
    assert.deepEqual(secretFindings(edicion('Una empresa presenta un modelo nuevo. Importa por el precio.'), secretos), []);
  });

  test('el valor tal cual se detecta, y el aviso no lo repite', () => {
    const hallazgos = secretFindings(edicion(`Nota: ${FALSA}`), secretos);
    assert.ok(hallazgos.includes('the value of CLAUDE_CODE_OAUTH_TOKEN (as is)'));
    assert.ok(hallazgos.every((h) => !h.includes(FALSA)));
  });

  const disfraces: [string, string, RegExp][] = [
    ['del revés', [...FALSA].reverse().join(''), /reversed/],
    ['en base64', Buffer.from(FALSA).toString('base64'), /in base64/],
    ['en hexadecimal', Buffer.from(FALSA).toString('hex'), /in hex/],
    ['partido en varias líneas', FALSA.replace(/(.{10})/g, '$1\n'), /as is/],
    ['separado por espacios', FALSA.replace(/(.{6})/g, '$1 '), /as is/],
  ];
  for (const [nombre, texto, esperado] of disfraces) {
    test(`${nombre} también`, () => {
      assert.match(secretFindings(edicion(texto), secretos).join('\n'), esperado);
    });
  }

  test('algo con forma de token se rechaza aunque no sea de este job', () => {
    const casos = ['ghp_' + 'a1B2'.repeat(9), 'github_pat_' + '11AA_bb'.repeat(6), '-----BEGIN OPENSSH PRIVATE KEY-----'];
    for (const texto of casos) {
      assert.equal(secretFindings(edicion(texto)).length, 1, texto.slice(0, 12));
    }
  });

  test('un secreto vacío o demasiado corto no convierte cualquier texto en hallazgo', () => {
    assert.deepEqual(secretFindings(edicion('abc y poco más'), { GITHUB_TOKEN: '', GH_TOKEN: 'abc', OTRO: undefined }), []);
  });

  test('desde el workflow: sale con 1, nombra el fichero y calla el valor', () => {
    const dir = mkdtempSync(join(tmpdir(), 'credenciales-'));
    const limpia = join(dir, 'noticias-2026-10-14.mdx');
    const sucia = join(dir, 'noticia-2026-10-14.mdx');
    writeFileSync(limpia, edicion('Todo en orden.'));
    writeFileSync(sucia, edicion(`Aquí va: ${FALSA}`));
    const lanzar = (...ficheros: string[]) =>
      spawnSync(process.execPath, [SCRIPT, ...ficheros], { env: { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: FALSA }, encoding: 'utf8' });

    // Un día sin protagonista, el segundo fichero no existe: no es un error.
    const bien = lanzar(limpia, join(dir, 'no-existe.mdx'));
    assert.equal(bien.status, 0, bien.stderr);
    assert.match(bien.stdout, /ok — no credential in 1 file\(s\)/);

    const mal = lanzar(limpia, sucia);
    assert.equal(mal.status, 1);
    assert.match(mal.stderr, /noticia-2026-10-14\.mdx: contains the value of CLAUDE_CODE_OAUTH_TOKEN/);
    assert.match(mal.stderr, /REFUSING TO PUBLISH/);
    assert.equal((mal.stdout + mal.stderr).includes(FALSA), false, 'el valor no puede acabar en el log');

    // Sin ningún fichero que mirar no se da el visto bueno.
    assert.equal(lanzar(join(dir, 'no-existe.mdx')).status, 1);
  });
});
