import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  MAX_CARACTERES,
  aCommentary,
  cuerpoDePost,
  diasHastaCaducar,
  escaparLittle,
  extraerImagen,
  extraerPost,
  publicar,
  subirImagen,
  urlDePost,
} from '../scripts/social/linkedin.mjs';

/**
 * Publicar en LinkedIn por la API oficial (17-oct-2026). Lo que se comprueba es
 * lo que, si falla, publica algo distinto de lo que Kata aprobó: el texto que
 * llega a LinkedIn, quién puede dar la orden y que no se publique dos veces.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const leer = (ruta: string) => readFileSync(join(root, ruta), 'utf8');

describe('el texto del post', () => {
  test('escapa los caracteres reservados de LinkedIn, que si no cortan el texto', () => {
    assert.equal(escaparLittle('(Replit) @ropa [x] a_b *c* ~d~ <e> | {f} #g \\'), '\\(Replit\\) \\@ropa \\[x\\] a\\_b \\*c\\* \\~d\\~ \\<e\\> \\| \\{f\\} \\#g \\\\');
  });

  test('deja tal cual los emojis, los saltos de línea y la puntuación normal', () => {
    const texto = '🤖 El CEO de Replit dice: «autónoma».\n\nLa máquina prepara. ¿Y tú?';
    assert.equal(aCommentary(texto), texto);
  });

  test('una #etiqueta pasa a la plantilla de hashtag, y un # suelto se escapa', () => {
    assert.equal(aCommentary('Hola #IA y #negocio'), 'Hola {hashtag|\\#|IA} y {hashtag|\\#|negocio}');
    assert.equal(aCommentary('Punto # suelto'), 'Punto \\# suelto');
  });
});

describe('la issue con el post', () => {
  test('el post es lo que hay entre las dos marcas', () => {
    assert.equal(extraerPost('Notas\n<!-- post -->\n\nHola 🤖\n\n<!-- /post -->\nMás notas'), 'Hola 🤖');
  });

  test('sin marcas, vacío o demasiado largo, no se publica', () => {
    assert.throws(() => extraerPost('Hola sin marcas'), /entre/);
    assert.throws(() => extraerPost('<!-- post -->\n  \n<!-- /post -->'), /vacío/);
    assert.throws(() => extraerPost(`<!-- post -->${'a'.repeat(MAX_CARACTERES + 1)}<!-- /post -->`), /admite/);
  });
});

describe('la imagen del post', () => {
  const cuerpo = (extra: string) => `Contexto\n${extra}\n<!-- post -->\nHola\n<!-- /post -->`;

  test('se declara en la issue con su texto alternativo, y es opcional', () => {
    assert.equal(extraerImagen(cuerpo('')), null);
    assert.deepEqual(extraerImagen(cuerpo('<!-- imagen: docs/social/img/a.jpg -->\n<!-- alt: Un panel con un botón rojo -->')), {
      ruta: 'docs/social/img/a.jpg',
      alt: 'Un panel con un botón rojo',
    });
  });

  test('sin texto alternativo o fuera de la carpeta del repo, no se publica', () => {
    assert.throws(() => extraerImagen(cuerpo('<!-- imagen: docs/social/img/a.jpg -->')), /alternativo/);
    for (const mala of ['../secreto.png', '/etc/passwd', 'docs/social/img/../../.env', 'docs/social/img/a.svg', 'scripts/x.jpg']) {
      assert.throws(() => extraerImagen(cuerpo(`<!-- imagen: ${mala} -->\n<!-- alt: x -->`)), /tiene que estar en|carpeta|JPG/, mala);
    }
  });

  test('se sube en dos pasos y el post lleva su URN y su texto alternativo', async () => {
    const vistas: { url: string; init: RequestInit }[] = [];
    const peticion = async (url: string, init: RequestInit) => {
      vistas.push({ url, init });
      if (url.includes('initializeUpload')) {
        return new Response(JSON.stringify({ value: { uploadUrl: 'https://www.linkedin.com/dms-uploads/x', image: 'urn:li:image:ABC' } }), { status: 200 });
      }
      if (url.includes('dms-uploads')) return new Response(null, { status: 201 });
      return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:9' } });
    };
    const datos = new Uint8Array([1, 2, 3]);
    const r = await publicar({ token: 'T', personaId: 'p', texto: 'Hola', imagen: { datos, alt: 'Un panel' }, peticion: peticion as typeof fetch });
    assert.deepEqual(vistas.map((v) => v.url.split('?')[0]), [
      'https://api.linkedin.com/rest/images',
      'https://www.linkedin.com/dms-uploads/x',
      'https://api.linkedin.com/rest/posts',
    ]);
    assert.equal(vistas[0].init.method, 'POST');
    assert.match(String(vistas[0].init.body), /"owner":"urn:li:person:p"/);
    assert.equal(vistas[1].init.method, 'PUT');
    assert.equal(vistas[1].init.body, datos);
    assert.deepEqual(JSON.parse(String(vistas[2].init.body)).content, { media: { id: 'urn:li:image:ABC', altText: 'Un panel' } });
    assert.equal(r.url, urlDePost('urn:li:share:9'));
  });

  test('si la imagen falla, no se publica el post sin ella', async () => {
    let llamadasAPosts = 0;
    const peticion = async (url: string) => {
      if (url.includes('/rest/posts')) llamadasAPosts++;
      return new Response('nope', { status: 403 });
    };
    await assert.rejects(subirImagen({ token: 'T', personaId: 'p', datos: new Uint8Array([1]), peticion: peticion as unknown as typeof fetch }), /403/);
    await assert.rejects(publicar({ token: 'T', personaId: 'p', texto: 'Hola', imagen: { datos: new Uint8Array([1]), alt: 'x' }, peticion: peticion as unknown as typeof fetch }));
    assert.equal(llamadasAPosts, 0);
  });

  test('en ensayo valida la imagen sin llamar a la API', async () => {
    const r = await publicar({ token: undefined, personaId: 'p', texto: 'Hola', imagen: { datos: new Uint8Array([1]), alt: 'x' }, simular: true });
    assert.equal(r.simulado, true);
    assert.equal(r.cuerpo.content.media.altText, 'x');
  });
});

describe('la llamada a la API', () => {
  test('el cuerpo es un post público de tu perfil, sin nada más', () => {
    const cuerpo = cuerpoDePost({ personaId: 'abc123', texto: 'Hola' });
    assert.equal(cuerpo.author, 'urn:li:person:abc123');
    assert.equal(cuerpo.visibility, 'PUBLIC');
    assert.equal(cuerpo.lifecycleState, 'PUBLISHED');
    assert.equal(cuerpo.distribution.feedDistribution, 'MAIN_FEED');
    assert.throws(() => cuerpoDePost({ personaId: '', texto: 'Hola' }), /LINKEDIN_PERSON_ID/);
  });

  test('envía las cabeceras que exige la API y devuelve el enlace del post', async () => {
    let visto: { url: string; init: RequestInit } | undefined;
    const peticion = async (url: string, init: RequestInit) => {
      visto = { url, init };
      return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:123' } });
    };
    const r = await publicar({ token: 'T', personaId: 'p', texto: 'Hola', peticion: peticion as typeof fetch });
    assert.equal(visto!.url, 'https://api.linkedin.com/rest/posts');
    const cab = visto!.init.headers as Record<string, string>;
    assert.equal(cab.Authorization, 'Bearer T');
    assert.equal(cab['X-Restli-Protocol-Version'], '2.0.0');
    assert.match(cab['Linkedin-Version'], /^\d{6}$/);
    assert.deepEqual(r, { id: 'urn:li:share:123', url: urlDePost('urn:li:share:123') });
  });

  test('un 401 dice que hay que volver a autorizar, sin enseñar el permiso', async () => {
    const peticion = async () => new Response('{"message":"expired"}', { status: 401 });
    await assert.rejects(publicar({ token: 'SECRETO', personaId: 'p', texto: 'Hola', peticion: peticion as typeof fetch }), (e: Error) => {
      assert.match(e.message, /401/);
      assert.match(e.message, /linkedin:autorizar/);
      assert.doesNotMatch(e.message, /SECRETO/);
      return true;
    });
  });

  test('en ensayo no llama a la API', async () => {
    const peticion = async () => {
      throw new Error('no debe llamar');
    };
    const r = await publicar({ token: undefined, personaId: 'p', texto: 'Hola', simular: true, peticion: peticion as unknown as typeof fetch });
    assert.equal(r.simulado, true);
  });

  test('cuenta los días que le quedan al permiso', () => {
    const hoy = new Date('2026-10-17T10:00:00Z');
    assert.equal(diasHastaCaducar('2026-10-27', hoy), 9);
    assert.equal(diasHastaCaducar('2026-10-10', hoy), -8);
    assert.equal(diasHastaCaducar('', hoy), null);
  });
});

describe('el workflow linkedin-publicar', () => {
  const wf = leer('.github/workflows/linkedin-publicar.yml');

  test('solo se lanza con la etiqueta de aprobación y solo si la pone el dueño del repo', () => {
    assert.match(wf, /github\.event\.label\.name == 'publicar-linkedin'/);
    assert.match(wf, /github\.actor == github\.repository_owner/);
  });

  test('no interpola el texto de la issue en el shell, ni imprime secretos', () => {
    assert.doesNotMatch(wf, /\$\{\{\s*github\.event\.issue\.(body|title)/);
    assert.doesNotMatch(wf, /echo[^\n]*secrets\./);
  });

  test('no publica dos veces la misma issue y quita la etiqueta si falla', () => {
    assert.match(wf, /publicado-linkedin/);
    assert.match(wf, /--remove-label publicar-linkedin/);
    assert.match(wf, /gh issue close/);
  });

  test('tiene ensayo a mano y un solo trabajo a la vez', () => {
    assert.match(wf, /workflow_dispatch:/);
    assert.match(wf, /ensayo:/);
    assert.match(wf, /concurrency:/);
  });
});

describe('la autorización de una sola vez', () => {
  const auth = leer('scripts/social/linkedin-autorizar.mjs');

  test('guarda el permiso en GitHub por la entrada estándar y nunca en disco', () => {
    assert.match(auth, /spawnSync\("gh", \["secret", "set"/);
    assert.match(auth, /input: valor/);
    assert.doesNotMatch(auth, /writeFileSync|appendFileSync/);
  });

  test('pide solo permiso para publicar en tu perfil y comprueba el state', () => {
    assert.match(auth, /"openid profile w_member_social"/);
    assert.match(auth, /state/);
  });
});
