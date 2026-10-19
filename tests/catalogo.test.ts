import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sitemap from '@/app/sitemap';
import {
  CATALOGO,
  CATALOGO_REPO_URL,
  INSTALAR_EN_CLAUDE_CODE,
  INSTALAR_EN_LA_APP,
  INSTALAR_EN_OTROS_AGENTES,
  INSTALAR_EN_CODEX,
  AGENTES,
  npxSkillsPara,
  carpetaEnRepo,
  comandoDeSkill,
  urlEnRepo,
} from '@/config/catalogo';
import { LIBRARY_ITEMS } from '@/config/library';
import { PERSONA, siteConfig } from '@/config/site';
import { ACTIVOS, activosDestacados, getActivo, rutaDeActivo } from '@/lib/catalogo';
import { TITULO_BUSQUEDA_MAX, assertActivo, type Activo } from '@/lib/evidence';
import { softwareSourceCodeJsonLd } from '@/lib/jsonld';
import { DESCRIPCION_MAX } from '@/lib/seo';

/**
 * El catálogo: lo que un lector se puede instalar, y lo que su ficha afirma.
 *
 * Una skill acaba dentro de la herramienta con la que alguien lleva su negocio.
 * La ficha existe para que pueda decidir antes: qué lee, qué escribe, qué sale
 * de su equipo, qué versión es y con qué licencia. `assertActivo` rompe la
 * build si falta una de esas filas; aquí se prueba que muerde, y que una skill
 * no puede tener página sin estar en el listado, ni un comando de instalación
 * que no salga de la configuración del repositorio.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const source = (file: string) => readFileSync(join(root, file), 'utf8');

const activo = (over: Partial<Activo> = {}): Activo => ({
  tipo: 'skill',
  tituloBusqueda: 'Skill de Claude para reclamar facturas',
  version: '1.0.0',
  publicado: '2026-10-13',
  ruta: 'skills/seguimiento-cobros',
  licencia: 'MIT',
  paraQuien: 'Quien factura a empresas.',
  noEsPara: 'Quien cobra al contado.',
  requisitos: ['Un agente compatible.'],
  lee: ['Tus facturas pendientes.'],
  escribe: [],
  red: 'Nada por su cuenta.',
  pruebas: 'Sin pruebas automáticas.',
  ...over,
});

describe('la ficha de un activo no puede dejar una fila en blanco', () => {
  test('una ficha completa pasa, y escribir nada es una respuesta válida', () => {
    assert.doesNotThrow(() => assertActivo('prueba', activo()));
  });

  const INCOMPLETAS: [string, Partial<Activo>, RegExp][] = [
    ['sin título de búsqueda', { tituloBusqueda: ' ' }, /tituloBusqueda/],
    ['con un título que no cabe en el resultado', { tituloBusqueda: 'x'.repeat(TITULO_BUSQUEDA_MAX + 1) }, /tituloBusqueda/],
    ['con una versión que no es major.minor.patch', { version: '1.0' }, /versión/],
    ['sin fecha de publicación', { publicado: 'octubre' }, /publicado/],
    ['con una ruta que sale del repositorio', { ruta: '../otro' }, /ruta/],
    ['con una licencia que no es SPDX', { licencia: 'gratis' }, /licencia/],
    ['sin decir para quién no es', { noEsPara: '' }, /noEsPara/],
    ['sin requisitos', { requisitos: [] }, /requisitos/],
    ['sin decir qué lee', { lee: [] }, /permisos/],
    ['sin decir qué sale del equipo', { red: '' }, /red/],
    ['sin decir cómo se ha probado', { pruebas: '' }, /pruebas/],
  ];
  for (const [nombre, over, mensaje] of INCOMPLETAS) {
    test(`${nombre} rompe la build`, () => {
      assert.throws(() => assertActivo('prueba', activo(over)), mensaje);
    });
  }
});

describe('lo publicado en el catálogo', () => {
  test('hay activos, o este bloque no prueba nada', () => {
    assert.ok(ACTIVOS.length > 0);
    assert.equal(ACTIVOS.length, LIBRARY_ITEMS.filter((item) => item.activo).length);
  });

  test('cada activo tiene su página, y la página está en el sitemap', () => {
    const urls = new Set(sitemap().map((entry) => entry.url));
    for (const item of ACTIVOS) {
      assert.equal(item.href, rutaDeActivo(item.id), item.id);
      assert.equal(getActivo(item.id), item);
      assert.ok(urls.has(`${siteConfig.url}${item.href}`), `${item.id} no está en el sitemap.`);
    }
    assert.equal(getActivo('no-existe'), undefined);
  });

  test('el id es el nombre de la skill en el repositorio, con las reglas de Agent Skills', () => {
    for (const item of ACTIVOS) {
      assert.match(item.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, item.id);
      assert.ok(item.id.length <= 64, item.id);
      assert.equal(item.activo.ruta, `skills/${item.id}`, `${item.id}: la ruta no es la carpeta de la skill.`);
    }
    assert.equal(new Set(ACTIVOS.map((item) => item.id)).size, ACTIVOS.length, 'hay ids repetidos');
  });

  test('título y resumen caben en un resultado de búsqueda', () => {
    for (const item of ACTIVOS) {
      assert.ok(item.activo.tituloBusqueda.length <= TITULO_BUSQUEDA_MAX, item.id);
      assert.ok(item.queHace.length <= DESCRIPCION_MAX, `${item.id}: el resumen tiene ${item.queHace.length} caracteres.`);
    }
    const titulos = ACTIVOS.map((item) => item.activo.tituloBusqueda);
    assert.equal(new Set(titulos).size, titulos.length, 'dos activos comparten título de búsqueda');
  });

  test('la muestra de la home es variada: un activo por tema', () => {
    const muestra = activosDestacados();
    assert.ok(muestra.length > 0 && muestra.length <= 3);
    assert.equal(new Set(muestra.map((item) => item.tema)).size, muestra.length);
  });

  test('la skill de entrada existe, y no ocupa un sitio en la muestra', () => {
    // Sin ella, cada ficha enlazaría una «bienvenida» que no está en el catálogo.
    assert.ok(getActivo(CATALOGO.entrada), `${CATALOGO.entrada} no es un activo del catálogo.`);
    assert.ok(!activosDestacados().some((item) => item.id === CATALOGO.entrada));
  });

  test('ningún activo dice estar en uso: son nuevos y se pueden reproducir', () => {
    // «En producción» o «en uso en mi negocio» necesitarían algo que enseñar. Lo que
    // hay es un ejemplo resuelto o unas pruebas en el repositorio, y la ficha lo enlaza.
    for (const item of ACTIVOS) {
      assert.equal(item.evidencia.tipo, 'reproducible', item.id);
      if (item.evidencia.tipo !== 'reproducible') continue;
      assert.match(item.evidencia.ruta, new RegExp(`^(skills/${item.id}/|tests/)`), item.id);
      assert.match(item.activo.pruebas, /Sin uso todavía/, `${item.id}: la ficha tiene que decir que no se ha usado aún.`);
    }
  });

  test('lo que sale del equipo se dice skill a skill', () => {
    // Las que no abren conexiones lo dicen igual; la que audita una web dice a cuál se conecta.
    const conRed = ACTIVOS.filter((item) => !/no abre conexiones/.test(item.activo.red));
    assert.deepEqual(conRed.map((item) => item.id), ['visibilidad-en-ia']);
    assert.match(conRed[0].activo.red, /a ninguna otra/);
  });
});

describe('cómo se instala', () => {
  test('los comandos salen de la configuración del repositorio, no escritos a mano', () => {
    const slug = `${CATALOGO.repo.owner}/${CATALOGO.repo.name}`;
    assert.deepEqual([...INSTALAR_EN_CLAUDE_CODE], [
      `/plugin marketplace add ${slug}`,
      `/plugin install ${CATALOGO.plugin}@${CATALOGO.marketplace}`,
    ]);
    assert.equal(INSTALAR_EN_OTROS_AGENTES, `npx skills add ${slug}`);
    assert.equal(CATALOGO_REPO_URL, `https://github.com/${slug}`);
    assert.equal(comandoDeSkill('cierre-mensual'), `/${CATALOGO.plugin}:cierre-mensual`);
    assert.equal(
      urlEnRepo('skills/cierre-mensual/SKILL.md'),
      `${CATALOGO_REPO_URL}/blob/${CATALOGO.repo.ref}/skills/cierre-mensual/SKILL.md`,
    );
    assert.equal(carpetaEnRepo('skills/empezar'), `${CATALOGO_REPO_URL}/tree/${CATALOGO.repo.ref}/skills/empezar`);
  });

  test('en la aplicación de Claude se instala sin terminal, por el mismo repositorio y con fecha', () => {
    // La 2.0.0 no entraba por aquí: nadie lo había probado y la ficha mandaba a
    // «subir la carpeta», que tampoco. El camino es el que se recorrió ese día.
    assert.equal(INSTALAR_EN_LA_APP.repositorio, `${CATALOGO.repo.owner}/${CATALOGO.repo.name}`);
    assert.match(INSTALAR_EN_LA_APP.comprobado, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(INSTALAR_EN_LA_APP.menus[0], 'Personalización');
    assert.equal(INSTALAR_EN_LA_APP.menus.at(-1), 'Añadir desde un repositorio');
    const app = AGENTES.find((a) => a.id === 'app');
    assert.deepEqual(app?.lineas, [INSTALAR_EN_LA_APP.repositorio]);
    assert.equal(app?.comprobado, INSTALAR_EN_LA_APP.comprobado);
    const pagina = readFileSync(join(root, 'src/app/marketplace/[id]/page.tsx'), 'utf8');
    assert.doesNotMatch(pagina, /súbela como skill/, 'el consejo de subir la carpeta nunca se probó');
  });

  test('cada agente tiene su forma de instalarlo, y dice si se ha probado', () => {
    // 2026-10-15: las skills son Agent Skills y no solo de Claude. Una fecha en
    // `comprobado` es una instalación desde cero con una skill funcionando;
    // sin ella la página dice que sigue la documentación del agente.
    const slug = `${CATALOGO.repo.owner}/${CATALOGO.repo.name}`;
    assert.deepEqual(AGENTES.map((a) => a.id), ['app', 'claude-code', 'codex', 'opencode', 'antigravity', 'gemini-cli', 'cursor', 'github-copilot', 'otro']);
    assert.deepEqual([...INSTALAR_EN_CODEX], [
      `codex plugin marketplace add ${slug}`,
      `codex plugin add ${CATALOGO.plugin}@${CATALOGO.marketplace}`,
    ]);
    assert.equal(npxSkillsPara('opencode'), `npx skills add ${slug} -a opencode`);
    for (const agente of AGENTES) {
      assert.ok(agente.lineas.length > 0 && agente.nota.length > 0, agente.id);
      if (agente.comprobado !== null) assert.match(agente.comprobado, /^\d{4}-\d{2}-\d{2}$/, agente.id);
    }
    const probados = AGENTES.filter((a) => a.comprobado).map((a) => a.id);
    assert.deepEqual(probados, ['app', 'claude-code', 'codex', 'opencode'], 'solo lleva fecha lo que se ha instalado de verdad');
    const instalar = source('src/components/marketplace/instalar.tsx');
    assert.match(instalar, /no lo he probado/);
  });

  test('ningún comando pide permisos de más ni ejecuta lo que se descarga', () => {
    for (const linea of [...INSTALAR_EN_CLAUDE_CODE, INSTALAR_EN_OTROS_AGENTES, ...AGENTES.flatMap((a) => a.lineas)]) {
      assert.doesNotMatch(linea, /\bsudo\b|\bcurl\b|\bwget\b|\|\s*(ba)?sh\b/, linea);
    }
  });

  test('el nombre del plugin no empieza por una marca reservada', () => {
    // El validador de Claude Code lo rechaza: claude-, anthropic-, cc-plugin-.
    assert.doesNotMatch(CATALOGO.plugin, /^(claude|anthropics?|cc-plugin)(-|$)/);
    assert.match(CATALOGO.repo.ref, /^v\d+\.\d+\.\d+$/, 'la ficha describe una versión etiquetada, no una rama');
  });

  test('la versión de cada ficha es la etiqueta que enlaza', () => {
    // La 1.0.0 se etiquetó con cinco skills que un instalador se saltaba. Si la
    // ficha dijera una versión y el enlace abriera otra, describiría un fichero
    // distinto del que el lector se instala.
    for (const item of ACTIVOS) {
      assert.equal(`v${item.activo.version}`, CATALOGO.repo.ref, `${item.id}: la ficha dice ${item.activo.version}.`);
    }
  });
});

describe('las páginas pintan lo que la ficha dice', () => {
  test('la página de un activo saca todo de la ficha y responde 404 a lo que no existe', () => {
    const pagina = source('src/app/marketplace/[id]/page.tsx');
    assert.match(pagina, /return ACTIVOS\.map\(\(item\) => \(\{ id: item\.id \}\)\);/);
    assert.match(pagina, /if \(!item\) notFound\(\);/);
    for (const fila of ['activo.paraQuien', 'activo.noEsPara', 'activo.requisitos', 'activo.lee', 'activo.escribe', 'activo.red', 'activo.pruebas', 'activo.version', 'activo.licencia', 'item.seRompio', 'item.costeMensual']) {
      assert.ok(pagina.includes(fila), `la página ya no pinta ${fila}.`);
    }
    assert.match(pagina, /<Instalar \/>/);
    assert.match(pagina, /softwareSourceCodeJsonLd\(/);
    assert.match(pagina, /apareceEn\(item\.id\)/);
  });

  test('los listados salen de la misma lista y desaparecen si no hay activos', () => {
    assert.match(source('src/app/marketplace/page.tsx'), /\{ACTIVOS\.length > 0 \? \(/, '/marketplace pintaría una sección de skills vacía.');
    // The home's skills come through the front page model: its sample of the same list.
    assert.match(source('src/lib/portada-lectura.ts'), /activos: ACTIVOS,\s*destacados: activosDestacados\(\),/);
    assert.match(source('src/components/portada/portada.tsx'), /\{activos\.length > 0 \? \(/, 'la home pintaría un bloque de skills vacío.');
    // Un activo no es un «sistema aún sin artículo»: tiene su sección y su página.
    assert.match(source('src/app/sistemas/page.tsx'), /\(item\) => !item\.activo &&/);
  });

  test('el comando se puede leer y seleccionar sin JavaScript', () => {
    const boton = source('src/components/sistema/copiar-comando.tsx');
    assert.match(boton, /<code>\{lineas\.join\("\\n"\)\}<\/code>/);
    assert.match(boton, /role="status"/);
  });

  test('los datos estructurados repiten lo que se ve: repositorio, versión y licencia', () => {
    const [item] = ACTIVOS;
    const data = softwareSourceCodeJsonLd({
      nombre: item.title,
      descripcion: item.queHace,
      path: item.href,
      codeRepository: CATALOGO_REPO_URL,
      version: item.activo.version,
      publicado: item.activo.publicado,
      licencia: item.activo.licencia,
    }) as Record<string, unknown>;
    assert.equal(data['@type'], 'SoftwareSourceCode');
    assert.equal(data.codeRepository, CATALOGO_REPO_URL);
    assert.equal(data.version, item.activo.version);
    assert.equal(data.license, `https://spdx.org/licenses/${item.activo.licencia}.html`);
    // 17-oct-2026: the author is the person both sites share (PERSONA), not a node of this domain.
    assert.equal((data.author as Record<string, unknown>)['@id'], PERSONA.id);
  });
});
