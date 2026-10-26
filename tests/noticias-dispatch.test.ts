import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dispatchNoticias, isCronCall } from '@/lib/noticias-dispatch';

/**
 * El disparo diario de las noticias desde Vercel Cron.
 *
 * El cron propio de GitHub arranca ese workflow con horas de retraso (el turno
 * de las 02:23 UTC empezaba hacia las 07:30), así que Vercel, que sí es
 * puntual, lo lanza con un `workflow_dispatch`. Si esta ruta se abriera sin
 * secreto, cualquiera podría gastar ejecuciones del workflow; si no llegara a
 * GitHub, la edición saldría tarde otra vez sin que nadie lo viera.
 */

const root = join(import.meta.dirname, '..');
const SECRETO = 'secreto-de-cron-de-prueba';
const TOKEN = 'github_pat_de_prueba_no_usar';

type Llamada = { url: string; init: RequestInit };

/** Un fetch que apunta lo que le piden y responde con el status dado. */
function fetchFalso(status: number, llamadas: Llamada[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    llamadas.push({ url: String(url), init: init ?? {} });
    return new Response(null, { status });
  }) as typeof fetch;
}

describe('quién puede disparar', () => {
  test('solo la llamada con el Bearer exacto', () => {
    assert.equal(isCronCall(`Bearer ${SECRETO}`, SECRETO), true);
    assert.equal(isCronCall('Bearer otro', SECRETO), false);
    assert.equal(isCronCall(SECRETO, SECRETO), false, 'sin «Bearer» no vale.');
    assert.equal(isCronCall(null, SECRETO), false);
    assert.equal(isCronCall('', SECRETO), false);
    assert.equal(isCronCall(`Bearer ${SECRETO}x`, SECRETO), false, 'una cabecera más larga no entra.');
  });

  test('sin secreto configurado no entra nadie, ni «Bearer undefined»', () => {
    assert.equal(isCronCall('Bearer undefined', undefined), false);
    assert.equal(isCronCall('Bearer ', ''), false);
    assert.equal(isCronCall('Bearer ', undefined), false);
    assert.equal(isCronCall(null, undefined), false);
  });
});

describe('la llamada a GitHub', () => {
  test('lanza noticias-diarias.yml sobre main, con el token y sin inputs (no es un ensayo)', async () => {
    const llamadas: Llamada[] = [];
    const resultado = await dispatchNoticias({ token: TOKEN, fetchImpl: fetchFalso(204, llamadas) });

    assert.deepEqual(resultado, { ok: true });
    assert.equal(llamadas.length, 1);
    const [{ url, init }] = llamadas;
    assert.equal(
      url,
      'https://api.github.com/repos/katasavyuk-pixel/kata-blog/actions/workflows/noticias-diarias.yml/dispatches',
    );
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(String(init.body)), { ref: 'main' });
    const cabeceras = init.headers as Record<string, string>;
    assert.equal(cabeceras.authorization, `Bearer ${TOKEN}`);
    assert.equal(cabeceras['x-github-api-version'], '2022-11-28');
  });

  test('un rechazo de GitHub vuelve como su status, no como excepción', async () => {
    for (const status of [401, 403, 404, 422]) {
      const resultado = await dispatchNoticias({ token: TOKEN, fetchImpl: fetchFalso(status, []) });
      assert.deepEqual(resultado, { ok: false, status });
    }
  });

  test('un 200 tampoco vale: GitHub contesta 204 cuando acepta el disparo', async () => {
    const resultado = await dispatchNoticias({ token: TOKEN, fetchImpl: fetchFalso(200, []) });
    assert.deepEqual(resultado, { ok: false, status: 200 });
  });
});

describe('la ruta /api/cron/noticias', () => {
  const previo = {
    cron: process.env.CRON_SECRET,
    token: process.env.GITHUB_DISPATCH_TOKEN,
    fetch: globalThis.fetch,
  };
  let llamadas: Llamada[];

  const pedir = async (autorizacion?: string) => {
    const { GET } = await import('@/app/api/cron/noticias/route');
    const request = new Request('https://kata.ianexora.com/api/cron/noticias', {
      headers: autorizacion ? { authorization: autorizacion } : {},
    });
    const respuesta = await GET(request);
    return { status: respuesta.status, cuerpo: await respuesta.text() };
  };

  beforeEach(() => {
    llamadas = [];
    process.env.CRON_SECRET = SECRETO;
    process.env.GITHUB_DISPATCH_TOKEN = TOKEN;
    globalThis.fetch = fetchFalso(204, llamadas);
  });
  afterEach(() => {
    if (previo.cron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previo.cron;
    if (previo.token === undefined) delete process.env.GITHUB_DISPATCH_TOKEN;
    else process.env.GITHUB_DISPATCH_TOKEN = previo.token;
    globalThis.fetch = previo.fetch;
  });

  test('con la llamada de Vercel dispara el workflow una vez y contesta 200', async () => {
    const { status, cuerpo } = await pedir(`Bearer ${SECRETO}`);
    assert.equal(status, 200);
    assert.deepEqual(JSON.parse(cuerpo), { ok: true, workflow: 'noticias-diarias.yml' });
    assert.equal(llamadas.length, 1);
  });

  test('sin Bearer o con uno equivocado: 401 y GitHub ni se entera', async () => {
    assert.equal((await pedir()).status, 401);
    assert.equal((await pedir('Bearer equivocado')).status, 401);
    assert.equal(llamadas.length, 0);
  });

  test('sin CRON_SECRET se cierra (503), aunque llegue «Bearer undefined»', async () => {
    delete process.env.CRON_SECRET;
    assert.equal((await pedir('Bearer undefined')).status, 503);
    assert.equal((await pedir()).status, 503);
    assert.equal(llamadas.length, 0);
  });

  test('sin token de GitHub contesta 503 y lo dice, para que se vea en el log del cron', async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    const { status, cuerpo } = await pedir(`Bearer ${SECRETO}`);
    assert.equal(status, 503);
    assert.match(cuerpo, /GITHUB_DISPATCH_TOKEN/);
    assert.equal(llamadas.length, 0);
  });

  test('si GitHub rechaza el disparo, 502 con su status y sin repetir ningún secreto', async () => {
    globalThis.fetch = fetchFalso(403, llamadas);
    const { status, cuerpo } = await pedir(`Bearer ${SECRETO}`);
    assert.equal(status, 502);
    assert.equal(JSON.parse(cuerpo).status, 403);
    assert.ok(!cuerpo.includes(TOKEN) && !cuerpo.includes(SECRETO));
  });

  test('si GitHub no responde, 502 y no una excepción sin controlar', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    const { status, cuerpo } = await pedir(`Bearer ${SECRETO}`);
    assert.equal(status, 502);
    assert.equal(JSON.parse(cuerpo).error, 'github_inalcanzable');
  });
});

describe('vercel.json', () => {
  const { crons } = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as {
    crons: { path: string; schedule: string }[];
  };

  test('cada cron apunta a una ruta que existe', () => {
    assert.ok(crons.length > 0);
    for (const { path } of crons) {
      assert.ok(
        existsSync(join(root, 'src/app', path, 'route.ts')),
        `${path} no tiene ruta: el cron daría 404 cada día sin que nadie lo viera.`,
      );
    }
  });

  test('cada cron corre una vez al día, que es lo que admite el plan Hobby de Vercel', () => {
    // Una expresión que corra más veces (`*/5`, listas, rangos) hace fallar el
    // despliegue entero en Hobby, y con él la publicación de todo lo demás.
    for (const { schedule } of crons) {
      assert.match(schedule, /^\d{1,2} \d{1,2} \* \* \*$/, `«${schedule}» no es una vez al día.`);
    }
  });
});
