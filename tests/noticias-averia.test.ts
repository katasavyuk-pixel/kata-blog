import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  INCIDENT_LABEL,
  INCIDENT_TITLE,
  decide,
  editionPath,
  entry,
  failedSteps,
  githubApi,
  readState,
  report,
} from '../scripts/radar/incident.mjs';
import { claudeFailureReason } from '../scripts/radar/claude-result.mjs';

/**
 * El estado del día y la incidencia rodante.
 *
 * Entre el 5 de septiembre y el 13 de octubre de 2026 fallaron 29 de 40
 * ejecuciones y nadie se enteró: cada fallo era un correo más de GitHub. Aquí se
 * prueba la regla que lo sustituye: una sola incidencia, abierta por el primer
 * intento que falla y cerrada por el primero que ve una edición publicada.
 *
 * Todo corre contra un GitHub de mentira: nada de esto toca la red.
 */

const ROOT = join(import.meta.dirname, '..');
const FECHA = '2026-10-14';

type Respuesta = { status: number; data?: unknown };
type Llamada = { method: string; path: string; body?: Record<string, unknown> };

/** A fake `api`: answers by `METHOD path`, records every call. */
function github(respuestas: Record<string, Respuesta>) {
  const llamadas: Llamada[] = [];
  const api = async (method: string, path: string, body?: Record<string, unknown>) => {
    llamadas.push({ method, path, body });
    const r = respuestas[`${method} ${path}`] ?? { status: 404 };
    return { status: r.status, data: r.data ?? null };
  };
  return { api, llamadas };
}

const CONTENIDO = `GET /contents/${editionPath(FECHA)}?ref=main`;
const DEPLOY = 'GET /commits/main/status';
const ABIERTAS = `GET /issues?labels=${INCIDENT_LABEL}&state=open&per_page=1`;
const vercel = (state: string) => ({ status: 200, data: { statuses: [{ context: 'Vercel', state }] } });

describe('estado del día', () => {
  test('edición publicada, despliegue bien, sin incidencia', async () => {
    const { api } = github({ [CONTENIDO]: { status: 200 }, [DEPLOY]: vercel('success'), [ABIERTAS]: { status: 200, data: [] } });
    assert.deepEqual(await readState(api, FECHA), { edition: 'published', deploy: 'success', incident: null });
  });

  test('sin edición, con una incidencia abierta', async () => {
    const { api } = github({ [CONTENIDO]: { status: 404 }, [DEPLOY]: vercel('pending'), [ABIERTAS]: { status: 200, data: [{ number: 51 }] } });
    assert.deepEqual(await readState(api, FECHA), { edition: 'missing', deploy: 'pending', incident: 51 });
  });

  test('un despliegue en «error» cuenta como fallido, y sin estado de Vercel no se supone nada', async () => {
    const error = github({ [CONTENIDO]: { status: 200 }, [DEPLOY]: vercel('error'), [ABIERTAS]: { status: 200, data: [] } });
    assert.equal((await readState(error.api, FECHA)).deploy, 'failure');
    const nada = github({ [CONTENIDO]: { status: 200 }, [DEPLOY]: { status: 200, data: { statuses: [] } }, [ABIERTAS]: { status: 200, data: [] } });
    assert.equal((await readState(nada.api, FECHA)).deploy, 'unknown');
  });

  test('si no se puede saber si la edición está, no se adivina: escribir otra sería peor', async () => {
    const { api } = github({ [CONTENIDO]: { status: 500 } });
    await assert.rejects(readState(api, FECHA), /cannot tell whether the 2026-10-14 edition is on main \(HTTP 500\)/);
  });
});

describe('qué se hace con la incidencia', () => {
  const casos: [string, Parameters<typeof decide>[0], string][] = [
    ['el intento falló', { edition: 'missing', deploy: 'success', pipeline: 'failure' }, 'pipeline'],
    ['el intento se quedó sin tiempo', { edition: 'missing', deploy: 'success', pipeline: 'cancelled' }, 'pipeline'],
    ['no se pudo leer el estado', { edition: '', deploy: 'unknown', pipeline: 'skipped' }, 'state'],
    ['publicada, pero el despliegue falló', { edition: 'published', deploy: 'failure', pipeline: 'skipped' }, 'deploy'],
    ['acaba de publicarse', { edition: 'missing', deploy: 'success', pipeline: 'success' }, 'recovered'],
    ['ya estaba publicada y desplegada', { edition: 'published', deploy: 'success', pipeline: 'skipped' }, 'recovered'],
    ['publicada, despliegue aún en marcha', { edition: 'published', deploy: 'pending', pipeline: 'skipped' }, 'none'],
    ['publicada, sin estado de Vercel', { edition: 'published', deploy: 'unknown', pipeline: 'skipped' }, 'none'],
  ];
  for (const [nombre, estado, esperado] of casos) {
    test(nombre, () => assert.equal(decide(estado).kind, esperado));
  }

  test('publicar encima de un despliegue roto no se da por arreglado sin más: lo mira el siguiente intento', () => {
    // `deploy` se leyó antes de publicar: habla del commit anterior.
    assert.equal(decide({ edition: 'missing', deploy: 'failure', pipeline: 'success' }).kind, 'recovered');
    assert.equal(decide({ edition: 'published', deploy: 'failure', pipeline: 'skipped' }).kind, 'deploy');
  });
});

describe('pasos fallidos de una ejecución', () => {
  test('se nombran como job › paso', () => {
    const jobs = [
      { name: '¿Falta la edición de hoy?', conclusion: 'success', steps: [] },
      {
        name: 'Escribir, verificar y publicar',
        conclusion: 'failure',
        steps: [
          { name: 'Install dependencies', conclusion: 'success' },
          { name: 'Write edition with Claude', conclusion: 'failure' },
          { name: 'Publish', conclusion: 'skipped' },
        ],
      },
    ];
    assert.deepEqual(failedSteps(jobs), ['Escribir, verificar y publicar › Write edition with Claude']);
  });

  test('un job que muere sin ningún paso fallido también se dice', () => {
    // Así acababan los fallos del runner del portátil: cero pasos y ninguna pista.
    const [linea] = failedSteps([{ name: 'Escribir, verificar y publicar', conclusion: 'cancelled', steps: [] }]);
    assert.match(linea, /terminó como cancelled sin ningún paso fallido/);
  });
});

describe('la incidencia, de principio a fin', () => {
  const base = { date: FECHA, time: '04:31', runId: '777', repoUrl: 'https://github.com/o/r' };
  const JOBS = 'GET /actions/runs/777/jobs?per_page=30';
  const jobsFallidos = {
    status: 200,
    data: { jobs: [{ name: 'Escribir, verificar y publicar', conclusion: 'failure', steps: [{ name: 'Write edition with Claude', conclusion: 'failure' }] }] },
  };

  test('el primer fallo la abre, con el paso, el motivo y el enlace', async () => {
    const { api, llamadas } = github({ [JOBS]: jobsFallidos, 'POST /labels': { status: 201 }, 'POST /issues': { status: 201, data: { number: 60 } } });
    const hecho = await report(api, {
      ...base,
      state: { edition: 'missing', deploy: 'success', incident: null },
      pipeline: 'failure',
      claudeReason: 'Claude AI usage limit reached|1791900000',
    });
    assert.equal(hecho, 'opened');
    const alta = llamadas.find((l) => l.method === 'POST' && l.path === '/issues');
    assert.equal(alta?.body?.title, INCIDENT_TITLE);
    assert.deepEqual(alta?.body?.labels, [INCIDENT_LABEL]);
    const cuerpo = String(alta?.body?.body);
    assert.match(cuerpo, /\*\*2026-10-14, 04:31 UTC\*\*/);
    assert.match(cuerpo, /«Escribir, verificar y publicar › Write edition with Claude»/);
    assert.match(cuerpo, /https:\/\/github\.com\/o\/r\/actions\/runs\/777/);
    assert.match(cuerpo, /«Claude AI usage limit reached\|1791900000»/);
    assert.match(cuerpo, /se cierra sola/);
  });

  test('el segundo fallo es un comentario en la misma, no otra incidencia', async () => {
    const { api, llamadas } = github({ [JOBS]: jobsFallidos, 'POST /issues/60/comments': { status: 201 } });
    const hecho = await report(api, { ...base, state: { edition: 'missing', deploy: 'success', incident: 60 }, pipeline: 'failure', claudeReason: '' });
    assert.equal(hecho, 'commented');
    assert.equal(llamadas.some((l) => l.method === 'POST' && l.path === '/issues'), false);
    assert.doesNotMatch(String(llamadas.at(-1)?.body?.body), /respondió Claude/);
  });

  test('la primera edición que sale la cierra', async () => {
    const { api, llamadas } = github({ 'POST /issues/60/comments': { status: 201 }, 'PATCH /issues/60': { status: 200 } });
    const hecho = await report(api, { ...base, state: { edition: 'missing', deploy: 'success', incident: 60 }, pipeline: 'success', claudeReason: '' });
    assert.equal(hecho, 'closed');
    assert.deepEqual(llamadas.at(-1), { method: 'PATCH', path: '/issues/60', body: { state: 'closed', state_reason: 'completed' } });
  });

  test('un día normal no escribe nada en GitHub', async () => {
    const { api, llamadas } = github({});
    assert.equal(await report(api, { ...base, state: { edition: 'published', deploy: 'success', incident: null }, pipeline: 'skipped', claudeReason: '' }), 'nothing');
    assert.equal(await report(api, { ...base, state: { edition: 'missing', deploy: 'success', incident: null }, pipeline: 'success', claudeReason: '' }), 'nothing');
    assert.deepEqual(llamadas, []);
  });

  test('un despliegue fallido se cuenta como lo que es: la edición está, el sitio no', async () => {
    const { api, llamadas } = github({ 'POST /labels': { status: 422 }, 'POST /issues': { status: 201, data: { number: 61 } } });
    const hecho = await report(api, { ...base, state: { edition: 'published', deploy: 'failure', incident: null }, pipeline: 'skipped', claudeReason: '' });
    assert.equal(hecho, 'opened', 'que la etiqueta ya exista (422) no impide abrirla');
    assert.match(String(llamadas.at(-1)?.body?.body), /el último despliegue de Vercel falló/);
    assert.equal(llamadas.some((l) => l.path.startsWith('/actions/runs')), false);
  });

  test('si GitHub no deja abrirla, el paso falla en vez de callar', async () => {
    const { api } = github({ [JOBS]: jobsFallidos, 'POST /issues': { status: 403 } });
    await assert.rejects(
      report(api, { ...base, state: { edition: 'missing', deploy: 'success', incident: null }, pipeline: 'failure', claudeReason: '' }),
      /could not open the incident \(HTTP 403\)/,
    );
  });

  test('un motivo larguísimo o con saltos de línea no desborda el comentario', () => {
    const texto = entry({ kind: 'pipeline', date: FECHA, time: '04:31', failed: [], claudeReason: `línea uno\nlínea dos ${'x'.repeat(900)}` });
    const cita = texto.match(/«(línea uno[^»]*)»/)?.[1] ?? '';
    assert.ok(cita.length <= 300, `la cita mide ${cita.length}`);
    assert.doesNotMatch(cita, /\n/);
  });
});

describe('cliente de la API', () => {
  test('habla con el repositorio indicado y no revienta con una respuesta vacía', async () => {
    const vistas: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      vistas.push({ url, init });
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    const api = githubApi({ token: 't0ken', repo: 'o/r', fetchImpl });
    assert.deepEqual(await api('PATCH', '/issues/1', { state: 'closed' }), { status: 204, data: null });
    assert.equal(vistas[0].url, 'https://api.github.com/repos/o/r/issues/1');
    assert.equal((vistas[0].init.headers as Record<string, string>).authorization, 'Bearer t0ken');
    assert.equal(vistas[0].init.body, '{"state":"closed"}');
  });

  test('sin credenciales el script sale con 1 y lo dice', () => {
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts/radar/incident.mjs'), 'status'], {
      env: { ...process.env, GITHUB_TOKEN: '', GITHUB_REPOSITORY: '' },
      encoding: 'utf8',
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /GITHUB_TOKEN and GITHUB_REPOSITORY are required/);
  });
});

describe('por qué se paró Claude', () => {
  // La forma es la del fichero que guarda claude-code-action: la lista de
  // mensajes del SDK, con el resultado al final.
  const init = { type: 'system', subtype: 'init', model: 'claude-opus-5-5' };

  test('un resultado con error da su texto', () => {
    const mensajes = [init, { type: 'result', subtype: 'success', is_error: true, num_turns: 1, total_cost_usd: 0, result: 'Claude AI usage limit reached|1791900000' }];
    assert.equal(claudeFailureReason(mensajes), 'Claude AI usage limit reached|1791900000');
  });

  test('un resultado correcto no es el motivo de nada', () => {
    const mensajes = [init, { type: 'result', subtype: 'success', is_error: false, result: 'He escrito la edición.' }];
    assert.equal(claudeFailureReason(mensajes), '');
  });

  test('sin texto, al menos dice cómo acabó', () => {
    assert.equal(claudeFailureReason([{ type: 'result', subtype: 'error_max_turns', is_error: true }]), 'the run ended as error_max_turns without a message');
  });

  test('sin resultado, o con cualquier otra cosa, no inventa', () => {
    assert.equal(claudeFailureReason([init]), '');
    assert.equal(claudeFailureReason(null), '');
    assert.equal(claudeFailureReason({ type: 'result', is_error: true, result: 'un solo objeto también vale' }), 'un solo objeto también vale');
  });

  test('desde el workflow: escribe `motivo` en una línea y nunca falla el paso', () => {
    const dir = mkdtempSync(join(tmpdir(), 'claude-result-'));
    const fichero = join(dir, 'claude-execution-output.json');
    const salida = join(dir, 'github-output');
    writeFileSync(salida, '');
    writeFileSync(fichero, JSON.stringify([init, { type: 'result', subtype: 'success', is_error: true, result: 'API Error: 401\n{"type":"error"}' }]));
    const script = join(ROOT, 'scripts/radar/claude-result.mjs');
    const env = { ...process.env, GITHUB_OUTPUT: salida };

    const conMotivo = spawnSync(process.execPath, [script, fichero], { env, encoding: 'utf8' });
    assert.equal(conMotivo.status, 0, conMotivo.stderr);
    assert.equal(readFileSync(salida, 'utf8'), 'motivo=API Error: 401 {"type":"error"}\n');

    writeFileSync(salida, '');
    const sinFichero = spawnSync(process.execPath, [script, join(dir, 'no-existe.json')], { env, encoding: 'utf8' });
    assert.equal(sinFichero.status, 0);
    assert.match(sinFichero.stdout, /No errored Claude result to report/);
    assert.equal(readFileSync(salida, 'utf8'), '');
  });
});
