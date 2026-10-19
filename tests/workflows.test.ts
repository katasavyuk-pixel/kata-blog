import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/**
 * Los workflows de GitHub Actions, comprobados donde ya se rompieron.
 *
 * Hasta el 14-oct-2026 tres de ellos corrían en el portátil de Kata: con el
 * portátil dormido no había CI, y ese ejecutor fue la causa de 15 de los 29
 * fallos de la tubería de noticias. Los pasos de Claude, además, tienen dos
 * reglas aprendidas en el ejecutor: permisos con ruta (una regla `Read` a
 * secas alcanza todo el disco) y `github_token` explícito (sin él la acción
 * puede saltarse el paso y darlo por bueno).
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, '.github/workflows');
const WORKFLOWS = readdirSync(dir)
  .filter((f) => f.endsWith('.yml'))
  .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf8') }));

/** The `with:` block of every claude-code-action step. */
function pasosDeClaude(text: string): string[] {
  return text.split(/\n\s+- name: /).filter((paso) => /uses: anthropics\/claude-code-action@/.test(paso));
}

describe('dónde corren', () => {
  test('ningún job depende del portátil', () => {
    assert.ok(WORKFLOWS.length >= 5);
    for (const { file, text } of WORKFLOWS) {
      assert.doesNotMatch(text, /runs-on:\s*self-hosted/, `${file} vuelve al ejecutor del portátil.`);
      for (const [, runner] of text.matchAll(/runs-on:\s*(\S+)/g)) {
        assert.equal(runner, 'ubuntu-latest', `${file} corre en ${runner}.`);
      }
    }
  });

  test('cada job tiene un tope de tiempo', () => {
    for (const { file, text } of WORKFLOWS.filter((w) => w.file !== 'noticias-diarias.yml')) {
      const jobs = text.match(/runs-on:/g)?.length ?? 0;
      const topes = text.match(/timeout-minutes:\s*\d+/g)?.length ?? 0;
      assert.equal(topes, jobs, `${file}: ${jobs} jobs y ${topes} topes.`);
    }
  });
});

describe('los pasos de Claude', () => {
  const pasos = WORKFLOWS.flatMap(({ file, text }) => pasosDeClaude(text).map((paso) => ({ file, paso })));

  test('hay pasos que comprobar', () => {
    assert.ok(pasos.length >= 3);
  });

  test('llevan github_token explícito y nunca id-token', () => {
    for (const { file, paso } of pasos) {
      assert.match(paso, /github_token: \$\{\{ github\.token \}\}/, `${file}: un paso de Claude sin github_token.`);
    }
    for (const { file, text } of WORKFLOWS) {
      assert.doesNotMatch(text, /id-token:\s*write/, `${file} pide id-token: el intercambio OIDC hacía que la acción se saltara.`);
    }
  });

  test('sus permisos van con ruta: nada de Read, Write o Glob a secas', () => {
    for (const { file, paso } of pasos) {
      const permitidas = paso.match(/--allowedTools\s+"?([^"\n]+)"?/)?.[1];
      assert.ok(permitidas, `${file}: un paso de Claude sin --allowedTools.`);
      for (const regla of permitidas.split(',').map((r) => r.trim())) {
        assert.match(regla, /^(Read|Edit)\([^)]+\)$/, `${file}: la regla «${regla}» no lleva ruta.`);
      }
      assert.match(paso, /--disallowedTools\s+"Bash,WebFetch,WebSearch"/, `${file}: un paso de Claude puede usar Bash o la red.`);
    }
  });

  test('el de YouTube no reescribe un borrador que espera revisión', () => {
    const yt = WORKFLOWS.find((w) => w.file === 'youtube-nuevo.yml')!.text;
    const guarda = yt.indexOf('startswith("video/")');
    const claude = yt.indexOf('uses: anthropics/claude-code-action@');
    assert.ok(guarda > 0 && guarda < claude, 'la comprobación del borrador abierto va antes de llamar a Claude.');
    assert.match(yt, /if \[ "\$count" != "0" \] && \[ -n "\$abierto" \]; then[\s\S]*?count=0/);
  });

  test('el de YouTube solo puede dejar posts nuevos', () => {
    const yt = WORKFLOWS.find((w) => w.file === 'youtube-nuevo.yml')!.text;
    const claude = yt.indexOf('uses: anthropics/claude-code-action@');
    const guarda = yt.indexOf('- name: Only new posts, nothing else');
    const pr = yt.indexOf('uses: peter-evans/create-pull-request@');
    assert.ok(claude < guarda && guarda < pr, 'la comprobación va entre Claude y el PR.');
  });
});

describe('el modelo de los pasos de Claude', () => {
  test('todos fijan modelo y fuentes de ajustes, para no heredar los de la máquina', () => {
    for (const { file, text } of WORKFLOWS) {
      for (const paso of pasosDeClaude(text)) {
        assert.match(paso, /--model claude-opus-5-5/, `${file}: un paso de Claude sin modelo fijado.`);
        assert.match(paso, /--setting-sources project/, `${file}: un paso de Claude que hereda los ajustes del ejecutor.`);
      }
    }
  });
});

describe('las issues «Revisión Noticias»', () => {
  const text = WORKFLOWS.find((w) => w.file === 'noticias-diarias.yml')!.text;

  test('al abrir la de hoy se cierran las anteriores, sin borrarlas', () => {
    const crear = text.indexOf('await github.rest.issues.create(');
    const cerrar = text.indexOf("state: 'closed'");
    assert.ok(crear > 0 && cerrar > crear, 'el cierre va después de crear la de hoy.');
    assert.match(text, /startsWith\(prefijo\)/);
    assert.match(text, /vieja\.pull_request/, 'las PR también salen en el listado de issues: no se tocan.');
    assert.doesNotMatch(text, /issues\.delete|state: 'deleted'/);
  });
});

describe('el borrador semanal', () => {
  const text = WORKFLOWS.find((w) => w.file === 'semanal-borrador.yml')!.text;

  test('corre los jueves por la mañana (UTC) y a mano', () => {
    assert.match(text, /cron: "\d+ [0-9] \* \* 4"/);
    assert.match(text, /workflow_dispatch:/);
  });

  test('no escribe otro borrador mientras haya uno abierto, ni toca una edición existente', () => {
    const guarda = text.indexOf('startswith("semanal/")');
    const script = text.indexOf('npm run semanal 2>&1');
    assert.ok(guarda > 0 && guarda < script, 'la comprobación del borrador abierto va antes del script.');
    assert.match(text, /ya existe\|ya no es un borrador/);
    assert.doesNotMatch(text, /--forzar/);
  });

  test('solo puede dejar una edición nueva, y se verifica antes de abrir la PR', () => {
    const script = text.indexOf('npm run semanal 2>&1');
    const verificar = text.indexOf('npm run verify && npm run build');
    const pr = text.indexOf('uses: peter-evans/create-pull-request@');
    assert.ok(script < verificar && verificar < pr, 'script → verify y build → PR.');
    assert.match(text, /content\/newsletters\/\[0-9\]\{4\}-s\[0-9\]\{2\}\\\.md/);
    assert.match(text, /add-paths: content\/newsletters\//);
  });

  test('avisa de que la PR no dispara ci.yml y recuerda el emoji del asunto', () => {
    assert.match(text, /no dispara `ci\.yml`/);
    assert.match(text, /Asunto con emoji delante/);
    assert.match(text, /tests\/asuntos\.test\.ts/);
  });

  test('el borrador que escribe el script ya pide el emoji en el asunto', () => {
    const lib = readFileSync(join(root, 'src/lib/semanal.ts'), 'utf8');
    assert.match(lib, /Asunto: un emoji delante que diga qué hay dentro/);
  });
});

describe('IndexNow', () => {
  const text = WORKFLOWS.find((w) => w.file === 'indexnow.yml')!.text;

  test('solo espera si hay algo que anunciar', () => {
    assert.match(text, /urls=\$\(node scripts\/seo\/indexnow\.mjs --diff="\$BEFORE" --listar\)/);
    assert.doesNotMatch(text, /git diff --name-only "\$BEFORE" -- content\//, 'vuelve a esperar por cualquier cambio en content/.');
    // --listar prints and leaves: no key lookup, no request. What it prints
    // depends on the working tree (`git diff HEAD`), so only its shape is
    // checked: paths, one per line, and never the line that announces a send.
    const r = spawnSync(process.execPath, ['scripts/seo/indexnow.mjs', '--diff=HEAD', '--listar'], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    for (const linea of r.stdout.split('\n').filter(Boolean)) assert.match(linea, /^\/[\w/-]*$/);
    assert.doesNotMatch(r.stdout, /notificando|aceptado|rechazado/);
  });

  test('espera al despliegue de ese commit, no a un reloj', () => {
    assert.doesNotMatch(text, /^\s*run: sleep \d+/m, 'vuelve a esperar a ciegas.');
    assert.match(text, /commits\/\$\{\{ github\.sha \}\}\/status/);
    assert.match(text, /statuses: read/);
    assert.match(text, /- name: Notificar URLs cambiadas\s+if: steps\.deploy\.outputs\.listo == 'true'/);
  });
});

describe('el detector de vídeos de YouTube', () => {
  // A local stand-in for the channel feed: what it answers is set per test.
  let respuesta = { status: 404, body: 'Not Found' };
  let peticiones = 0;
  let server: Server;
  let url = '';

  before(async () => {
    server = createServer((_req, res) => {
      peticiones += 1;
      res.writeHead(respuesta.status, { 'content-type': 'application/atom+xml' });
      res.end(respuesta.body);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const address = server.address();
    url = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/feed`;
  });
  after(() => new Promise<void>((r) => server.close(() => r())));

  function correr(): Promise<{ codigo: number | null; salida: string; resultado: { videos: unknown[]; feedDown?: string } | null }> {
    // The script writes scratch/youtube-new.json next to itself (git-ignored),
    // the same file the workflow reads.
    return new Promise((resolve) => {
      const hijo = spawn(process.execPath, ['scripts/radar/youtube.mjs'], {
        cwd: root,
        env: { ...process.env, YOUTUBE_FEED_URL: url, YOUTUBE_RETRY_MS: '10' },
      });
      let salida = '';
      hijo.stdout.on('data', (d) => (salida += d));
      hijo.stderr.on('data', (d) => (salida += d));
      hijo.on('close', (codigo) => {
        let resultado = null;
        try {
          resultado = JSON.parse(readFileSync(join(root, 'scratch/youtube-new.json'), 'utf8'));
        } catch {}
        rmSync(join(root, 'scratch/youtube-new.json'), { force: true });
        resolve({ codigo, salida, resultado });
      });
    });
  }

  test('con el feed en 404 lo intenta tres veces y termina en aviso, no en fallo', async () => {
    respuesta = { status: 404, body: 'Not Found' };
    peticiones = 0;
    const { codigo, salida, resultado } = await correr();
    assert.equal(codigo, 0);
    assert.equal(peticiones, 3);
    assert.match(salida, /::warning title=YouTube::El feed del canal no responde \(HTTP 404, tres intentos\)/);
    assert.deepEqual(resultado?.videos, []);
    assert.equal(resultado?.feedDown, 'HTTP 404');
  });

  test('un error que no es de disponibilidad sigue fallando', async () => {
    respuesta = { status: 403, body: 'Forbidden' };
    peticiones = 0;
    const { codigo } = await correr();
    assert.equal(codigo, 1);
    assert.equal(peticiones, 1, 'un 403 no se reintenta.');

    respuesta = { status: 200, body: '<html>no es un feed</html>' };
    assert.equal((await correr()).codigo, 1);
  });

  test('con el feed bien, encuentra el vídeo que no tiene post', async () => {
    respuesta = {
      status: 200,
      body: `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
        <entry><yt:videoId>zzzzNUEVOzzzz</yt:videoId><title>Un vídeo nuevo</title><published>2026-10-14T00:00:00+00:00</published>
        <media:group><media:description>Descripción.</media:description></media:group></entry></feed>`,
    };
    const { codigo, resultado } = await correr();
    assert.equal(codigo, 0);
    assert.deepEqual((resultado?.videos as { videoId: string }[]).map((v) => v.videoId), ['zzzzNUEVOzzzz']);
  });

  test('los Shorts no tienen borrador mientras la web no los enseña', async () => {
    // The five drafts of #16 were all Shorts (16 Oct 2026). Two ways the feed marks
    // one: a /shorts/ link, or the hashtag in the title or the description.
    respuesta = {
      status: 200,
      body: `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
        <entry><yt:videoId>zzzzCORTO1zzz</yt:videoId><title>Un corto</title><link rel="alternate" href="https://www.youtube.com/shorts/zzzzCORTO1zzz"/>
        <media:group><media:description>Vertical.</media:description></media:group></entry>
        <entry><yt:videoId>zzzzCORTO2zzz</yt:videoId><title>Otro corto #shorts</title><link rel="alternate" href="https://www.youtube.com/watch?v=zzzzCORTO2zzz"/>
        <media:group><media:description>Vertical.</media:description></media:group></entry>
        <entry><yt:videoId>zzzzLARGOzzzz</yt:videoId><title>Un episodio</title><link rel="alternate" href="https://www.youtube.com/watch?v=zzzzLARGOzzzz"/>
        <media:group><media:description>Horizontal.</media:description></media:group></entry></feed>`,
    };
    const { codigo, salida, resultado } = await correr();
    assert.equal(codigo, 0);
    assert.deepEqual((resultado?.videos as { videoId: string }[]).map((v) => v.videoId), ['zzzzLARGOzzzz']);
    assert.match(salida, /2 Shorts skipped/);
  });
});
