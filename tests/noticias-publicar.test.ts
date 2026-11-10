import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Publicación diaria segura frente a carreras.
 *
 * `publish-safe.sh` corre contra un remoto bare real en un directorio
 * temporal: nunca toca el repo del proyecto ni la red. Se comprueban los tres
 * finales posibles — publica, sincroniza y publica cuando `main` se movió, y
 * se detiene sin forzar cuando hay conflicto — más el cableado del workflow.
 */

const ROOT = join(import.meta.dirname, '..');
const SCRIPT = join(ROOT, 'scripts', 'radar', 'publish-safe.sh');

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
};

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8' }).trim();

let base: string;
let remote: string;

/** A fresh clone of the shared remote, on main, with an identity. */
function clone(name: string): string {
  const dir = join(base, name);
  execFileSync('git', ['clone', '-q', remote, dir], { env: GIT_ENV });
  git(dir, 'checkout', '-q', '-B', 'main', 'origin/main');
  return dir;
}

function publish(cwd: string, message: string, ...files: string[]) {
  return spawnSync('bash', [SCRIPT, message, ...files], { cwd, env: GIT_ENV, encoding: 'utf8' });
}

before(() => {
  base = mkdtempSync(join(tmpdir(), 'noticias-publicar-'));
  remote = join(base, 'remote.git');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote], { env: GIT_ENV });
  const seed = join(base, 'seed');
  mkdirSync(seed);
  execFileSync('git', ['init', '-q', '-b', 'main', seed], { env: GIT_ENV });
  mkdirSync(join(seed, 'content', 'posts'), { recursive: true });
  writeFileSync(join(seed, 'content', 'posts', 'base.mdx'), 'base\n');
  git(seed, 'add', '.');
  git(seed, 'commit', '-q', '-m', 'seed');
  git(seed, 'remote', 'add', 'origin', remote);
  git(seed, 'push', '-q', 'origin', 'main');
});

after(() => rmSync(base, { recursive: true, force: true }));

describe('publish-safe.sh', () => {
  test('camino feliz: commit y push a main', () => {
    const work = clone('feliz');
    writeFileSync(join(work, 'content', 'posts', 'noticias-2026-10-09.mdx'), 'edición\n');
    const result = publish(work, 'feat(noticias): edición 2026-10-09', 'content/posts/noticias-2026-10-09.mdx');
    assert.equal(result.status, 0, result.stderr);
    assert.match(git(remote, 'log', '--format=%s', 'main'), /edición 2026-10-09/);
  });

  test('si main se movió mientras corría: sincroniza (rebase) y publica sin force', () => {
    const work = clone('carrera');
    const other = clone('otro');
    // Someone else lands on main after `work` cloned.
    writeFileSync(join(other, 'content', 'posts', 'otro.mdx'), 'otro\n');
    git(other, 'add', 'content/posts/otro.mdx');
    git(other, 'commit', '-q', '-m', 'otro: cambio concurrente');
    git(other, 'push', '-q', 'origin', 'main');

    writeFileSync(join(work, 'content', 'posts', 'noticia-2026-10-10.mdx'), 'artículo\n');
    const result = publish(work, 'feat(noticias): edición 2026-10-10', 'content/posts/noticia-2026-10-10.mdx');
    assert.equal(result.status, 0, result.stderr);

    const log = git(remote, 'log', '--format=%s', 'main');
    assert.match(log, /edición 2026-10-10/);
    assert.match(log, /otro: cambio concurrente/, 'el commit ajeno debe seguir en main (no se pisó)');
    assert.equal(git(remote, 'rev-list', '--merges', '--count', 'main'), '0', 'historia lineal por rebase');
  });

  test('conflicto: se detiene (exit 2), no empuja nada y no deja un rebase a medias', () => {
    const work = clone('conflicto');
    const other = clone('rival');
    // Both sides create the same file with different content.
    writeFileSync(join(other, 'content', 'posts', 'noticias-2026-10-11.mdx'), 'versión del rival\n');
    git(other, 'add', 'content/posts/noticias-2026-10-11.mdx');
    git(other, 'commit', '-q', '-m', 'rival: misma edición');
    git(other, 'push', '-q', 'origin', 'main');
    const remoteBefore = git(remote, 'rev-parse', 'main');

    writeFileSync(join(work, 'content', 'posts', 'noticias-2026-10-11.mdx'), 'versión del bot\n');
    const result = publish(work, 'feat(noticias): edición 2026-10-11', 'content/posts/noticias-2026-10-11.mdx');

    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /CONFLICT/);
    assert.equal(git(remote, 'rev-parse', 'main'), remoteBefore, 'el remoto no debe cambiar');
    assert.equal(git(work, 'status', '--porcelain', '--untracked-files=no'), '', 'sin rebase a medias ni conflictos en el árbol');
    assert.throws(() => git(work, 'rev-parse', '--verify', '-q', 'REBASE_HEAD'), 'no debe quedar REBASE_HEAD');
  });

  test('sin cambios que publicar: sale 0 sin commit ni push', () => {
    const work = clone('vacio');
    const head = git(remote, 'rev-parse', 'main');
    const result = publish(work, 'feat(noticias): nada', 'content/posts/base.mdx');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(git(remote, 'rev-parse', 'main'), head);
  });

  test('falta de argumentos: error de uso', () => {
    const result = spawnSync('bash', [SCRIPT, 'solo mensaje'], { env: GIT_ENV, encoding: 'utf8' });
    assert.equal(result.status, 64);
  });
});

describe('cableado: nada de force push y publicación única', () => {
  const script = readFileSync(SCRIPT, 'utf8');
  const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'noticias-diarias.yml'), 'utf8');

  test('el script nunca fuerza ni resetea', () => {
    const code = script.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
    assert.doesNotMatch(code, /--force|-f\b|--force-with-lease|reset --hard|\+HEAD:/);
  });

  test('el workflow publica solo a través de publish-safe.sh y serializa las ejecuciones', () => {
    assert.match(workflow, /persist-credentials: false/);
    assert.match(workflow, /publish-safe\.sh/);
    assert.doesNotMatch(workflow, /^\s*git push/m, 'ningún git push directo en el workflow');
    assert.doesNotMatch(workflow, /--force/);
    assert.match(workflow, /concurrency:\s*\n\s+group: noticias-diarias\s*\n\s+cancel-in-progress: false/);
    assert.match(workflow, /GIT_CONFIG_KEY_0="http\.https:\/\/github\.com\/\.extraheader"/);
    assert.doesNotMatch(workflow, /x-access-token:\$\{GH_TOKEN\}/, 'el token no se persiste en .git/config');
  });

  test('la protagonista se decide antes de escribir la edición, y nunca tumba el día', () => {
    const escribe = workflow.indexOf('name: Write the lead article with Gemini');
    const decide = workflow.indexOf('settle-lead.mjs "$LEAD_FILE"');
    const edicion = workflow.indexOf('name: Write edition with Gemini');
    assert.ok(escribe > 0 && escribe < decide && decide < edicion, 'escribir → decidir → edición');
    assert.match(workflow, /if: steps\.lead\.outputs\.lead_status == 'lead'/);
    assert.match(workflow, /select-lead\.mjs/);
    // Si el paso de escritura falla, el siguiente retira el artículo y sigue.
    assert.match(paso('Write the lead article with Gemini'), /continue-on-error: true/);
    // El gate estricto ya no es un paso: con él, un artículo malo costaba la edición entera.
    assert.doesNotMatch(workflow, /run: node scripts\/radar\/verify-article\.mjs/);
    // Se publica lo que hay en disco: un artículo retirado ya no está.
    assert.match(paso('Publish'), /if \[ -f "\$LEAD_FILE" \]; then files\+=\("\$LEAD_FILE"\); fi/);
  });
});

/** The YAML of one step, from its `- name:` line to the next step. */
function paso(nombre: string): string {
  const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'noticias-diarias.yml'), 'utf8');
  const desde = workflow.indexOf(`      - name: ${nombre}`);
  assert.ok(desde > 0, `no hay ningún paso que empiece por «${nombre}»`);
  const resto = workflow.slice(desde + 1);
  const hasta = resto.search(/\n {6}- (name|uses): |\n {2}\w+:\n/);
  return resto.slice(0, hasta === -1 ? undefined : hasta);
}

/** The YAML of one job, from its key to the next job. */
function job(nombre: string): string {
  const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'noticias-diarias.yml'), 'utf8');
  const desde = workflow.indexOf(`\n  ${nombre}:\n`);
  assert.ok(desde > 0, `no hay job «${nombre}»`);
  const resto = workflow.slice(desde + 1);
  const hasta = resto.search(/\n {2}\w+:\n/);
  return resto.slice(0, hasta === -1 ? undefined : hasta);
}

describe('cableado: se puede repetir, no depende de un portátil y avisa', () => {
  const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'noticias-diarias.yml'), 'utf8');

  test('ningún job corre en el runner del portátil', () => {
    // 15 de los 29 fallos entre el 5-sep y el 13-oct-2026 fueron ese runner.
    const runners = [...workflow.matchAll(/^\s+runs-on: (.+)$/gm)].map((m) => m[1]);
    assert.deepEqual(runners, ['ubuntu-latest', 'ubuntu-latest', 'ubuntu-latest']);
  });

  test('varios intentos al día, fuera de la hora en punto', () => {
    const crons = [...workflow.matchAll(/- cron: "(\d+) (\d+) \* \* \*"/g)].map((m) => ({ minuto: Number(m[1]), hora: Number(m[2]) }));
    assert.ok(crons.length >= 2, 'un solo intento no sobrevive a una mañana mala');
    for (const { minuto } of crons) assert.notEqual(minuto, 0, 'GitHub retrasa más los cron de la hora en punto');
    assert.equal(new Set(crons.map((c) => c.hora)).size, crons.length, 'cada intento a una hora distinta');
  });

  test('repetirlo no escribe dos ediciones: solo corre si falta la de hoy', () => {
    assert.match(job('estado'), /node scripts\/radar\/incident\.mjs status/);
    const noticias = job('noticias');
    assert.match(noticias, /needs: estado/);
    assert.match(noticias, /if: needs\.estado\.outputs\.edition == 'missing' \|\| github\.ref != 'refs\/heads\/main' \|\| inputs\.ensayo/);
    // Una sola fecha para todo el run, aunque cruce la medianoche.
    assert.match(noticias, /EDITION_DATE: \$\{\{ needs\.estado\.outputs\.date \}\}/);
    assert.doesNotMatch(workflow, /date -u \+%F/);
  });

  test('un ensayo, o una rama que no es main, no publica ni abre incidencias', () => {
    assert.match(job('noticias'), /ENSAYO: \$\{\{ github\.ref != 'refs\/heads\/main' \|\| inputs\.ensayo == true \}\}/);
    for (const nombre of ['Publish', 'Open non-blocking review trail']) {
      assert.match(paso(nombre), /if: env\.ENSAYO != 'true'/, nombre);
    }
    assert.match(paso('Rehearsal starts from a clean day'), /if: env\.ENSAYO == 'true'/);
    assert.match(job('aviso'), /github\.ref == 'refs\/heads\/main' && !inputs\.ensayo/);
  });

  test('antes de publicar se construye el contenido igual que en el despliegue', () => {
    const orden = [
      'repair-edition.mjs "$EDITION_FILE"',
      'verify-edition.mjs "$EDITION_FILE"',
      'npm run build:content',
      'publish-safe.sh "feat(noticias)',
    ].map((trozo) => workflow.indexOf(trozo));
    assert.ok(orden.every((i) => i > 0), 'falta algún paso');
    assert.deepEqual(orden, [...orden].sort((a, b) => a - b), 'reparar → verificar → construir → publicar');
    // Si solo falla con la protagonista, se retira y se intenta la edición sola;
    // si falla sin ella, o vuelve a fallar, el paso falla y no se publica.
    assert.match(
      paso('Build the content the way the deploy will'),
      /run: \|\n\s+if npm run build:content; then exit 0; fi\n\s+if \[ ! -f "\$LEAD_FILE" \]; then exit 1; fi\n\s+node scripts\/radar\/settle-lead\.mjs "\$LEAD_FILE" --drop "[^"]+"\n\s+npm run build:content\n/,
    );
  });

  test('la escritura es un script del repo, no una acción que pueda saltarse el paso', () => {
    // La acción de Claude intercambiaba un token OIDC y, si el workflow no era
    // idéntico al de main, terminaba «bien» sin escribir nada. El script de
    // Gemini no habla con GitHub: o escribe el fichero o sale con error.
    for (const nombre of ['Write the lead article with Gemini', 'Write edition with Gemini']) {
      assert.match(paso(nombre), /run: node scripts\/radar\/write-with-gemini\.mjs (lead|edition)/, nombre);
      assert.doesNotMatch(paso(nombre), /uses:/, nombre);
    }
    assert.doesNotMatch(workflow, /anthropics\/claude-code-action/);
    assert.doesNotMatch(workflow, /id-token: write/);
  });

  test('nada sale del runner sin pasar por el control de credenciales', () => {
    const control = workflow.indexOf('node scripts/radar/no-secrets.mjs "$EDITION_FILE" "$LEAD_FILE"');
    assert.ok(control > workflow.indexOf('npm run build:content'), 'después de construir');
    assert.ok(control < workflow.indexOf('uses: actions/upload-artifact@v4'), 'antes de guardar el artefacto de un ensayo');
    assert.ok(control < workflow.indexOf('publish-safe.sh "feat(noticias)'), 'antes de publicar');
    const yaml = paso('Refuse to publish a credential');
    assert.match(yaml, /GEMINI_API_KEY: \$\{\{ secrets\.GEMINI_API_KEY \}\}/);
    assert.doesNotMatch(yaml, /\n\s+if: /, 'también corre en un ensayo');
  });

  test('el modelo y los ajustes no dependen de la máquina', () => {
    const script = readFileSync(join(ROOT, 'scripts', 'radar', 'write-with-gemini.mjs'), 'utf8');
    assert.match(script, /export const DEFAULT_MODEL = "gemini-2\.5-flash"/);
    // El workflow no elige modelo: usa el default del script, igual en todos los runners.
    for (const nombre of ['Write the lead article with Gemini', 'Write edition with Gemini']) {
      assert.doesNotMatch(paso(nombre), /GEMINI_MODEL/, nombre);
    }
  });

  test('el modelo solo puede escribir su fichero, y no lee nada de fuera del repo', () => {
    // Gemini no tiene herramientas: no lee el disco del runner ni busca en la web.
    // Los hechos le llegan en el prompt; el script escribe un solo fichero.
    const script = readFileSync(join(ROOT, 'scripts', 'radar', 'write-with-gemini.mjs'), 'utf8');
    assert.doesNotMatch(script, /google_search/);
    assert.doesNotMatch(script, /tools:\s*\[/);
    assert.match(script, /await writeFile\(outFile, mdx\)/);
    for (const nombre of ['Write the lead article with Gemini', 'Write edition with Gemini']) {
      assert.doesNotMatch(paso(nombre), /allowedTools|disallowedTools|WebSearch|WebFetch/, nombre);
    }
  });

  test('la edición solo teclea la url de cada ítem y su titular en español', () => {
    const prompt = readFileSync(join(ROOT, 'scripts', 'radar', 'write-with-gemini.mjs'), 'utf8');
    assert.match(prompt, /<RadarItem url="\.\.\." titular="\.\.\.">/);
    assert.doesNotMatch(prompt, /copy `title`/);
    // Lo que el script comprueba se le dice antes al modelo.
    assert.match(prompt, /in Spanish/);
    assert.match(prompt, /no figure, date, name or claim that is not\s+in them/);
    assert.match(prompt, /No double quotes/);
    const plantilla = readFileSync(join(ROOT, 'content', '_templates', 'noticias.mdx'), 'utf8');
    assert.match(plantilla, /<RadarItem url="\{\{URL_EXACTA_DEL_JSON\}\}" titular="\{\{TU_TITULAR_EN_ESPAÑOL\}\}">/);
    assert.doesNotMatch(plantilla, /^\s+title="/m);
  });

  test('cada job pide solo los permisos que usa', () => {
    assert.match(workflow, /^permissions: \{\}$/m);
    assert.match(job('estado'), /permissions:\n {6}contents: read\n {6}issues: read\n {6}statuses: read\n/);
    assert.match(job('noticias'), /permissions:\n {6}contents: write\n {6}issues: write\n {4}outputs:/);
    assert.match(job('aviso'), /permissions:\n {6}contents: read\n {6}issues: write\n {6}actions: read\n/);
  });

  test('el aviso corre aunque el intento haya muerto, y recibe lo que necesita', () => {
    const aviso = job('aviso');
    assert.match(aviso, /needs: \[estado, noticias\]/);
    assert.match(aviso, /always\(\)/);
    for (const condicion of [
      "needs.estado.result != 'success'",
      "needs.noticias.result == 'failure'",
      "needs.noticias.result == 'cancelled'",
      "needs.estado.outputs.deploy == 'failure'",
      "needs.estado.outputs.incident != ''",
    ]) {
      assert.ok(aviso.includes(condicion), condicion);
    }
    assert.match(aviso, /PIPELINE: \$\{\{ needs\.noticias\.result \}\}/);
    assert.match(aviso, /WRITE_REASON: \$\{\{ needs\.noticias\.outputs\.motivo \}\}/);
    assert.match(aviso, /node scripts\/radar\/incident\.mjs report/);
    // El motivo sale del fichero que guarda el script, solo si algo falló.
    assert.match(paso('Say why the writer stopped'), /if: failure\(\)/);
    assert.match(paso('Say why the writer stopped'), /write-result\.mjs/);
    assert.match(job('noticias'), /motivo: \$\{\{ steps\.motivo\.outputs\.motivo \}\}/);
  });

  test('ningún job se queda colgado gastando minutos', () => {
    for (const nombre of ['estado', 'noticias', 'aviso']) assert.match(job(nombre), /timeout-minutes: \d+/, nombre);
  });
});
