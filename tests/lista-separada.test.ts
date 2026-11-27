import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SupabaseClient } from '@supabase/supabase-js';
import { procesarAltaPersonal } from '@/lib/alta-formulario';
import { confirmarPorToken } from '@/lib/confirmar-suscriptor';
import { destinatariosConfirmadosNbi } from '@/lib/destinatarios-nbi';
import { buscarSuscriptorNbi, guardarPendienteNbi } from '@/lib/suscriptor-nbi';
import { ASUNTO_CONFIRMACION_BLOG, RESPUESTA_BLOG, remitenteBlog } from '@/lib/confirmacion-blog';
import { URL_CONFIRMADO, URL_SUSCRITO } from '@/lib/listas';
import { hashToken } from '@/lib/tokens';

/**
 * NEX-22: the personal blog posts to /api/alta and lands on its own list.
 * NBI keeps list=nbi. A dry run of the edition must not count the others,
 * and confirming a personal row must not schedule the NBI sequence.
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const leer = (file: string) => readFileSync(join(root, file), 'utf8');

type Fila = {
  id: string;
  email: string;
  status: string;
  list: string;
  unsubscribe_token: string | null;
  confirm_token_hash?: string | null;
  confirm_expires_at?: string | null;
  confirmed_at?: string | null;
  consent_at?: string | null;
} & Record<string, unknown>;

type Filtro = { op: string; col: string; val: unknown };

function aplicar(filas: Fila[], filtros: Filtro[]): Fila[] {
  return filas.filter((fila) =>
    filtros.every((f) => {
      const actual = fila[f.col];
      if (f.op === 'eq') return actual === f.val;
      if (f.op === 'lte') return String(actual) <= String(f.val);
      if (f.op === 'gt') return String(actual) > String(f.val);
      if (f.op === 'not:is' && f.val === null) return actual !== null && actual !== undefined;
      return true;
    }),
  );
}

function memoria(filas: Fila[] = []) {
  const upserts: { tabla: string; row: Record<string, unknown>; onConflict: string }[] = [];
  const inserts: { tabla: string; row: Record<string, unknown> }[] = [];

  function desde(tabla: string) {
    const filtros: Filtro[] = [];
    let parche: Record<string, unknown> | null = null;
    const builder = {
      select() {
        return builder;
      },
      eq(col: string, val: unknown) {
        filtros.push({ op: 'eq', col, val });
        return builder;
      },
      lte(col: string, val: unknown) {
        filtros.push({ op: 'lte', col, val });
        return builder;
      },
      gt(col: string, val: unknown) {
        filtros.push({ op: 'gt', col, val });
        return builder;
      },
      in() {
        return builder;
      },
      not(col: string, op: string, val: unknown) {
        filtros.push({ op: `not:${op}`, col, val });
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      update(patch: Record<string, unknown>) {
        parche = patch;
        return builder;
      },
      upsert(row: Record<string, unknown>, opts: { onConflict: string }) {
        upserts.push({ tabla, row, onConflict: opts.onConflict });
        return Promise.resolve({ error: null });
      },
      insert(row: Record<string, unknown>) {
        inserts.push({ tabla, row });
        return Promise.resolve({ error: null, data: null });
      },
      maybeSingle() {
        const coinciden = aplicar(filas, filtros);
        if (coinciden.length > 1) {
          return Promise.resolve({
            data: null,
            error: { message: 'multiple rows' },
          });
        }
        return Promise.resolve({ data: coinciden[0] ?? null, error: null });
      },
      then(
        onfulfilled?: (value: { data: Fila[] | null; error: null }) => unknown,
        onrejected?: (reason: unknown) => unknown,
      ) {
        const resolver = () => {
          if (parche) {
            for (const fila of aplicar(filas, filtros)) Object.assign(fila, parche);
            return { data: null, error: null as null };
          }
          const data = aplicar(filas, filtros).sort((a, b) => a.id.localeCompare(b.id));
          return { data, error: null as null };
        };
        return Promise.resolve()
          .then(resolver)
          .then(onfulfilled, onrejected);
      },
    };
    return builder;
  }

  const cliente = { from: desde } as unknown as SupabaseClient;
  return { cliente, upserts, inserts, filas };
}

function peticion(campos: Record<string, string>, origen = 'https://kataivanovych.com') {
  return new Request('https://ianexora.com/blog/api/alta', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: origen,
    },
    body: new URLSearchParams(campos).toString(),
  });
}

const AHORA = new Date('2026-11-26T12:00:00.000Z');

describe('POST /api/alta', () => {
  test('guarda pendiente en la lista pedida, con consent_at, y redirige', async () => {
    const db = memoria();
    const enviados: { from: string; replyTo: string; subject: string; text: string; html: string; to: string }[] = [];
    const respuesta = await procesarAltaPersonal(
      peticion({
        email: 'ana@example.com',
        consentimiento: 'si',
        lista: 'kataivanovych',
        origen: 'https://evil.example/phishing',
      }),
      {
        limite: () => true,
        ahora: () => AHORA,
        token: () => 'token-fijo',
        cliente: () => db.cliente,
        enviar: async (mensaje) => {
          enviados.push(mensaje);
          return null;
        },
      },
    );

    assert.equal(respuesta.status, 303);
    assert.equal(respuesta.headers.get('location'), URL_SUSCRITO);
    assert.equal(db.upserts.length, 1);
    assert.equal(db.inserts.length, 0);
    const fila = db.upserts[0]!;
    assert.equal(fila.onConflict, 'email,list');
    assert.equal(fila.tabla, 'subscribers');
    assert.equal(fila.row.email, 'ana@example.com');
    assert.equal(fila.row.list, 'kataivanovych');
    assert.equal(fila.row.status, 'pending');
    assert.equal(fila.row.consent_at, AHORA.toISOString());
    assert.equal(fila.row.confirm_token_hash, hashToken('token-fijo'));
    assert.equal(enviados.length, 1);
    assert.equal(enviados[0]!.from, remitenteBlog());
    assert.match(enviados[0]!.from, /^Kata Ivanovych </);
    assert.doesNotMatch(enviados[0]!.from, /NBI/);
    assert.equal(enviados[0]!.replyTo, RESPUESTA_BLOG);
    assert.equal(enviados[0]!.subject, ASUNTO_CONFIRMACION_BLOG);
    const copia = `${enviados[0]!.subject}\n${enviados[0]!.text}\n${enviados[0]!.html}`;
    assert.match(copia, /kataivanovych\.com/);
    assert.match(copia, /\/api\/confirm\?token=token-fijo/);
    assert.doesNotMatch(copia, /Newsletter de NBI/);
    assert.doesNotMatch(copia, /regalo/i);
    assert.doesNotMatch(copia, /Recupera horas/);
  });

  test('el honeypot redirige igual y no guarda nada', async () => {
    const db = memoria();
    let envios = 0;
    const respuesta = await procesarAltaPersonal(
      peticion({
        email: 'ana@example.com',
        consentimiento: 'si',
        lista: 'kataivanovych',
        website: 'https://spam.example',
      }),
      {
        limite: () => true,
        cliente: () => db.cliente,
        enviar: async () => {
          envios += 1;
          return null;
        },
      },
    );
    assert.equal(respuesta.status, 303);
    assert.equal(respuesta.headers.get('location'), URL_SUSCRITO);
    assert.equal(db.upserts.length, 0);
    assert.equal(envios, 0);
  });

  test('sin consentimiento no guarda', async () => {
    const db = memoria();
    const respuesta = await procesarAltaPersonal(
      peticion({ email: 'ana@example.com', lista: 'kataivanovych' }),
      {
        limite: () => true,
        cliente: () => db.cliente,
        enviar: async () => null,
      },
    );
    assert.equal(respuesta.status, 400);
    assert.equal(db.upserts.length, 0);
  });

  test('quien ya está confirmado en esa lista no se reescribe ni recibe otro correo', async () => {
    const db = memoria([
      {
        id: 'ya',
        email: 'ana@example.com',
        status: 'confirmed',
        list: 'kataivanovych',
        unsubscribe_token: 'baja',
      },
    ]);
    let envios = 0;
    const respuesta = await procesarAltaPersonal(
      peticion({ email: 'ana@example.com', consentimiento: 'si', lista: 'kataivanovych' }),
      {
        limite: () => true,
        cliente: () => db.cliente,
        enviar: async () => {
          envios += 1;
          return null;
        },
      },
    );
    assert.equal(respuesta.status, 303);
    assert.equal(respuesta.headers.get('location'), URL_SUSCRITO);
    assert.equal(db.upserts.length, 0);
    assert.equal(envios, 0);
    assert.equal(db.filas[0]!.status, 'confirmed');
  });

  test('bitacora es la lista kataivanovych', async () => {
    const db = memoria();
    const respuesta = await procesarAltaPersonal(
      peticion({ email: 'ana@example.com', consentimiento: 'si', lista: 'bitacora' }),
      {
        limite: () => true,
        ahora: () => AHORA,
        token: () => 'token-bitacora',
        cliente: () => db.cliente,
        enviar: async () => null,
      },
    );
    assert.equal(respuesta.status, 303);
    assert.equal(db.upserts.length, 1);
    assert.equal(db.upserts[0]!.row.list, 'kataivanovych');
    assert.equal(db.upserts[0]!.row.consent_at, AHORA.toISOString());
  });
});

describe('confirmación de una lista personal', () => {
  for (const lista of ['kataivanovych', 'club'] as const) {
    test(`${lista}: confirma la fila y no inserta scheduled_emails`, async () => {
      const token = `token-${lista}`;
      const db = memoria([
        {
          id: `id-${lista}`,
          email: 'ana@example.com',
          status: 'pending',
          list: lista,
          unsubscribe_token: null,
          confirm_token_hash: hashToken(token),
          confirm_expires_at: '2026-11-27T12:00:00.000Z',
        },
      ]);
      const programadas: unknown[] = [];
      const resultado = await confirmarPorToken(db.cliente, {
        token,
        resource: 'hoja-de-tu-semana',
        ahora: AHORA,
        tokenBaja: () => 'baja-personal',
        programarSecuencia: async (sub) => {
          programadas.push(sub);
          db.cliente.from('scheduled_emails').insert({ subscriber_id: sub.id });
        },
      });

      assert.equal(resultado.location, URL_CONFIRMADO);
      assert.equal(resultado.cookieEmail, null);
      assert.equal(programadas.length, 0);
      assert.equal(db.inserts.length, 0);
      assert.equal(db.filas[0]!.status, 'confirmed');
      assert.equal(db.filas[0]!.unsubscribe_token, 'baja-personal');
      assert.equal(db.filas[0]!.list, lista);
    });
  }

  test('nbi sigue programando la secuencia', async () => {
    const db = memoria([
      {
        id: 'id-nbi',
        email: 'nbi@example.com',
        status: 'pending',
        list: 'nbi',
        unsubscribe_token: null,
        confirm_token_hash: hashToken('token-nbi'),
        confirm_expires_at: '2026-11-27T12:00:00.000Z',
      },
    ]);
    let programadas = 0;
    const resultado = await confirmarPorToken(db.cliente, {
      token: 'token-nbi',
      ahora: AHORA,
      programarSecuencia: async () => {
        programadas += 1;
      },
    });
    assert.equal(programadas, 1);
    assert.match(resultado.location, /\/gracias\?confirmed=1$/);
    assert.equal(resultado.cookieEmail, 'nbi@example.com');
  });
});

describe('el ensayo en seco de sendIssue', () => {
  test('ignora confirmados de kataivanovych y de club', async () => {
    const asOf = '2026-01-01T00:00:00.000Z';
    const db = memoria([
      {
        id: 'a',
        email: 'nbi@example.com',
        status: 'confirmed',
        list: 'nbi',
        unsubscribe_token: 't-a',
        confirmed_at: '2025-06-01T00:00:00.000Z',
      },
      {
        id: 'b',
        email: 'blog@example.com',
        status: 'confirmed',
        list: 'kataivanovych',
        unsubscribe_token: 't-b',
        confirmed_at: '2025-06-01T00:00:00.000Z',
      },
      {
        id: 'c',
        email: 'club@example.com',
        status: 'confirmed',
        list: 'club',
        unsubscribe_token: 't-c',
        confirmed_at: '2025-06-01T00:00:00.000Z',
      },
      {
        id: 'd',
        email: 'pendiente@example.com',
        status: 'pending',
        list: 'nbi',
        unsubscribe_token: 't-d',
        confirmed_at: '2025-06-01T00:00:00.000Z',
      },
    ]);
    const lista = await destinatariosConfirmadosNbi(db.cliente, asOf);
    assert.deepEqual(
      lista.map((fila) => fila.email),
      ['nbi@example.com'],
    );

    const fuente = leer('src/lib/newsletter.tsx');
    const llamada = fuente.indexOf('await destinatariosConfirmadosNbi');
    const ensayo = fuente.indexOf('if (dryRun)');
    assert.ok(llamada !== -1 && ensayo !== -1 && llamada < ensayo);
    assert.doesNotMatch(fuente, /from\("subscribers"\)/);
  });
});

describe('alta de NBI', () => {
  test('el upsert cae en list=nbi con conflicto email,list', async () => {
    const db = memoria();
    const { error } = await guardarPendienteNbi(db.cliente, {
      email: 'nbi@example.com',
      status: 'pending',
      confirm_token_hash: 'hash',
      confirm_expires_at: '2026-11-27T12:00:00.000Z',
      consent_ip: null,
      consent_at: AHORA.toISOString(),
      source: 'site',
      locale: 'es',
      signup_path: '/',
    });
    assert.equal(error, null);
    assert.equal(db.upserts.length, 1);
    assert.equal(db.upserts[0]!.onConflict, 'email,list');
    assert.equal(db.upserts[0]!.row.list, 'nbi');
    assert.equal(db.upserts[0]!.row.email, 'nbi@example.com');

    const ruta = leer('src/app/api/subscribe/route.ts');
    assert.match(ruta, /guardarPendienteNbi/);
    assert.match(ruta, /buscarSuscriptorNbi/);
    assert.doesNotMatch(ruta, /maybeSingle/);
  });

  test('el mismo correo en dos listas no hace fallar la lectura de NBI', async () => {
    const db = memoria([
      {
        id: 'personal',
        email: 'ana@example.com',
        status: 'confirmed',
        list: 'kataivanovych',
        unsubscribe_token: 't-p',
      },
      {
        id: 'nbi',
        email: 'ana@example.com',
        status: 'pending',
        list: 'nbi',
        unsubscribe_token: null,
      },
    ]);
    const fila = await buscarSuscriptorNbi(db.cliente, 'ana@example.com');
    assert.equal(fila?.id, 'nbi');
    assert.equal(fila?.status, 'pending');
  });
});

describe('la migración y las lecturas por email', () => {
  test('0006 separa las listas y no pide un db push de 0001–0005', () => {
    const sql = leer('supabase/migrations/0006_subscriber_lists.sql');
    assert.match(sql, /list in \('nbi', 'kataivanovych', 'club'\)/);
    assert.match(sql, /consent_at/);
    assert.match(sql, /unique \(email, list\)/);
    assert.match(sql, /subscribers_list_status_idx/);
    assert.match(sql, /Do NOT run `supabase db push`/);
    assert.match(sql, /0001–0005/);
    assert.doesNotMatch(sql, /'bitacora'/);
  });

  test('ningún maybeSingle de subscribers por email se queda sin lista', () => {
    const pendientes: string[] = [];
    const recorrer = (dir: string) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre);
        if (statSync(ruta).isDirectory()) {
          recorrer(ruta);
          continue;
        }
        if (!nombre.endsWith('.ts') && !nombre.endsWith('.tsx')) continue;
        const texto = readFileSync(ruta, 'utf8');
        const tocaSuscriptores = texto.includes('from("subscribers")') || texto.includes("from('subscribers')");
        const porEmail =
          (texto.includes('.eq("email"') || texto.includes(".eq('email'")) && texto.includes('maybeSingle');
        if (!tocaSuscriptores || !porEmail) continue;
        const filtra =
          texto.includes('buscarSuscriptorNbi') ||
          texto.includes('.eq("list"') ||
          texto.includes(".eq('list'");
        if (!filtra) pendientes.push(ruta.slice(root.length + 1));
      }
    };
    recorrer(join(root, 'src'));
    assert.deepEqual(pendientes, []);
  });
});
