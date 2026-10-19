/**
 * SSOT for every deliverable the site gives away, and where each one is
 * listed: `listedOn` sends a system to /sistemas and a course, calculator or
 * tool to /recursos. (It was one page, "Biblioteca de Sistemas", until /sistemas
 * became the index of systems and nothing else.)
 *
 * Honesty rule: every item must be real. What used to be a free-text `proof`
 * string plus an optional `progress` number is now a single `evidencia` value
 * (src/lib/evidence.ts), so a card cannot claim it is in production without
 * saying where, and cannot be announced "en el taller" without a date. The
 * invariants run at module load, so a broken claim fails `next build`.
 *
 * `status` is derived rather than declared: the previous shape allowed
 * `status: "disponible"` next to a half-finished item, and that is exactly the
 * contradiction that shipped a card pointing at an unpublished post.
 */

import { TEMAS, type Tema } from "@/config/taxonomy";
import {
  assertActivo,
  assertCosteMensual,
  assertEvidencia,
  type Activo,
  type CosteMensual,
  type Evidencia,
} from "@/lib/evidence";

export type ChipColor = "coral" | "navy" | "toffee" | "forest";

/** @deprecated Use `Tema` from config/taxonomy — kept so consumers keep compiling. */
export type LibraryTheme = Tema;

/** Display labels per theme, in page order. */
export const LIBRARY_THEMES = TEMAS;

export type LibraryItem = {
  id: string;
  /** When set, title/blurb/href hydrate from the post with this slug. */
  slug?: string;
  title?: string;
  blurb?: string;
  href?: string;
  tema: Tema;
  color: ChipColor;
  glyph: string;
  /** Deliverable format shown as a badge (Curso interactivo, Calculadora…). */
  format: string;
  /** The one page that lists it. A system is something running in the business. */
  listedOn: "sistemas" | "recursos";
  /** What backs the claim — and the ficha's "estado". Validated at module load. */
  evidencia: Evidencia;
  /**
   * The ficha (src/components/sistema/ficha.tsx). Every line is a fact with a
   * place in this repo to check it; where there is no fact there is a reason,
   * never a guess. `seRompio` is empty when nothing documented broke — an
   * empty list is honest, an invented failure is not.
   */
  queHace: string;
  costeMensual: CosteMensual;
  seRompio: string[];
  recurso?: { label: string; href: string };
  captura?: { src: string; alt: string };
  /**
   * Set when the item is something a reader installs (a skill, an agent, a
   * template). It gets a page of its own at /sistemas/<id> with the full spec
   * sheet, and `assertActivo` fails the build if a row of it is blank.
   */
  activo?: Activo;
};

/** Announced work reads as "en el taller"; everything else is shippable today. */
export function libraryStatus(item: LibraryItem): "disponible" | "en-construccion" {
  return item.evidencia.tipo === "en-taller" ? "en-construccion" : "disponible";
}

/**
 * The skills of the catalogue. They live in the repository named in
 * config/catalogo.ts; what is here is the ficha of each one.
 *
 * `evidencia` is "reproducible": every skill ships a worked example, or the
 * tests its script runs against, that a reader can run before installing
 * anything. They are new. Nobody has used them in a real business yet, and each
 * ficha says so under «Cómo se ha probado», so nothing here claims "en
 * producción" or "en uso". What broke is what broke while testing them.
 */
const SKILL_COMUN = {
  color: "navy",
  glyph: "§",
  format: "Skill",
  listedOn: "sistemas",
  costeMensual: {
    medido: false,
    motivo: "depende de tu plan de Claude y de cuántos datos lea en cada uso",
  },
} satisfies Partial<LibraryItem>;

const ACTIVO_COMUN = {
  tipo: "skill",
  // The tag in config/catalogo.ts without its "v" (tests/catalogo.test.ts).
  version: "2.1.0",
  publicado: "2026-10-15",
  licencia: "MIT",
} satisfies Partial<Activo>;

const AGENTE = "La aplicación de Claude, Claude Code, Codex, OpenCode u otro agente compatible con Agent Skills.";
const PYTHON = "Python 3.9 o posterior donde se ejecute su script. No instala nada más.";
const SIN_RED =
  "Nada por su cuenta. Su script usa solo la biblioteca estándar de Python y no abre conexiones: lo que sale de tu equipo es lo que tu agente ya envía al modelo.";
const SIN_USO_REAL = "Sin uso todavía en negocios reales.";

type Skill = Pick<LibraryItem, "id" | "title" | "tema" | "queHace"> &
  Pick<Activo, "tituloBusqueda" | "paraQuien" | "noEsPara" | "lee" | "escribe" | "pruebas"> & {
    /** What it needs besides the agent and Python. */
    necesita: string;
    /** What leaves the machine by its own doing. Left out when the answer is «nothing». */
    red?: string;
    /** Where in the catalogue repository a reader can run it before installing. */
    ejemplo?: string;
    /**
     * What broke while testing it. Left out when nothing documented broke: an
     * empty list is the honest answer, and the page says so.
     */
    seRompio?: string[];
  };

const skill = ({ id, title, tema, queHace, necesita, red = SIN_RED, ejemplo, seRompio = [], ...activo }: Skill): LibraryItem => ({
  ...SKILL_COMUN,
  id,
  title,
  blurb: queHace,
  href: `/marketplace/${id}`,
  tema,
  queHace,
  seRompio,
  evidencia: { tipo: "reproducible", ruta: ejemplo ?? `skills/${id}/ejemplos` },
  activo: { ...ACTIVO_COMUN, ...activo, red, ruta: `skills/${id}`, requisitos: [AGENTE, PYTHON, necesita] },
});

const SKILLS: LibraryItem[] = [
  skill({
    id: "empezar",
    title: "Empezar: la bienvenida",
    tituloBusqueda: "Configurar las skills de Claude para tu negocio",
    tema: "ia-aplicada",
    queHace:
      "Pregunta por tu negocio una vez (a qué te dedicas, a quién vendes, cómo cobras) y lo guarda en un perfil que las demás skills leen para adaptarse.",
    paraQuien: "Quien instala estas skills por primera vez, para su negocio o para el de un cliente.",
    noEsPara: "No hace ningún trabajo de oficina por sí sola: deja a las demás listas para hacerlo.",
    necesita: "Tres minutos y saber cómo cobra el negocio. Lo que no sepas se queda apuntado como pendiente.",
    lee: ["Lo que contestes a nueve preguntas.", "El perfil anterior, si ya existe."],
    escribe: ["El fichero perfil-negocio.md, en tu carpeta de trabajo."],
    pruebas: `La ejecutaron de principio a fin modelos que no la conocían, de tres tamaños, sobre cuatro negocios inventados: los cuatro perfiles salieron válidos a la primera. Un script comprueba el perfil antes de enseñártelo. En la aplicación de Claude se ha instalado y ha arrancado en un chat; ahí no se ha completado entera. ${SIN_USO_REAL}`,
    seRompio: [
      "En las primeras pruebas, una sola pregunta sobre impuestos enseñaba dieciséis opciones numeradas. Ahora es abierta, con un ejemplo, y ninguna enseña más de cuatro salvo la de prioridades.",
      "Ofrecía «no lo sé» en preguntas que cualquiera sabe contestar de su negocio. Ahora solo donde tiene sentido.",
      "La versión 2.0.0 no se podía instalar desde la aplicación de Claude: el paquete declaraba su carpeta de una forma que Claude Code acepta y la aplicación rechaza. Lo vi al instalarla allí por primera vez; hasta entonces solo la había instalado desde la terminal. La 2.0.1 lo corrige.",
    ],
  }),
  skill({
    id: "reclamar-facturas",
    title: "Reclamar facturas",
    tituloBusqueda: "Reclamar facturas impagadas con intereses: skill de Claude",
    tema: "economia",
    queHace:
      "Calcula lo que te deben con los intereses de demora y los 40 € por factura que añade la ley, y redacta la reclamación que toca a cada cliente.",
    paraQuien: "Autónomos y empresas que facturan a otras empresas y cobran tarde.",
    noEsPara:
      "Quien vende solo a particulares: la ley de morosidad no se les aplica. Tampoco para deudas de una Administración ni para facturas que el cliente discute.",
    necesita: "El listado de facturas sin cobrar: cliente, número, fecha, vencimiento e importe.",
    lee: ["Tu listado de facturas pendientes.", "El perfil del negocio: plazo de cobro, trato y firma."],
    escribe: ["Una hoja reclamacion.xlsx con el cálculo, tramo a tramo.", "Los borradores de las reclamaciones. No los envía."],
    pruebas: `Cada interés se comprueba al céntimo contra la cuenta hecha a mano, y el tipo de cada semestre se leyó en el BOE el 13 de octubre de 2026. Un modelo que no la conocía la ejecutó entera sobre un negocio inventado: cifras correctas y un requerimiento con sus seis elementos. Ningún abogado ha revisado los modelos de carta. ${SIN_USO_REAL}`,
    seRompio: [
      "El requerimiento formal salía sin los datos para pagar. Ahora los lleva.",
      "Una propuesta de pago en dos plazos obligaba al modelo a dividir a mano. Ahora los dos importes los da el script.",
    ],
  }),
  skill({
    id: "visibilidad-en-ia",
    title: "Visibilidad en IA",
    tituloBusqueda: "Auditoría GEO: ¿puede ChatGPT leer tu web? Skill de Claude",
    tema: "captacion",
    queHace:
      "Nueve comprobaciones de si un asistente de IA puede encontrar y leer tu web, cada una con lo que ha visto y a quién pedirle el arreglo.",
    paraQuien: "Negocios con web propia que quieren saber si ChatGPT, Perplexity o Claude pueden leerla.",
    noEsPara: "No hace que una IA te recomiende, ni lo promete. Sin web no hay nada que auditar.",
    necesita: "La dirección de la web, y salida a internet donde se ejecute.",
    lee: ["Las páginas públicas de la web que le digas, su robots.txt y su sitemap."],
    escribe: ["Una hoja visibilidad-en-ia.xlsx con el resultado y el detalle página a página."],
    red: "Peticiones de lectura a la web que audita, y a ninguna otra: hasta treinta páginas, con medio segundo entre una y otra. No envía formularios ni entra en lo que robots.txt cierra.",
    ejemplo: "tests/test_visibilidad.py",
    pruebas:
      "Se prueba contra dos webs simuladas, una sana y otra con todos los defectos. Se ejecutó contra esta misma web el 13 de octubre de 2026: 40 páginas, siete comprobaciones bien y dos avisos. Sin uso todavía en webs de otros negocios.",
    seRompio: [
      "Exigía un «www» delante de un subdominio, que nadie escribe. Salió al ejecutarla contra esta web.",
      "No reconocía una marca personal como identidad: avisaba de que la web no decía quién era el negocio.",
    ],
  }),
  skill({
    id: "datos-de-documentos",
    title: "Datos de documentos",
    tituloBusqueda: "Extraer datos de facturas y correos: skill de Claude",
    tema: "operaciones",
    queHace:
      "Pasa facturas, pedidos y correos a una tabla. Cada dato lleva el trozo del documento del que sale; lo que no se puede comprobar se queda vacío.",
    paraQuien: "Quien copia a mano datos de facturas, pedidos o correos a una hoja o a un programa.",
    noEsPara: "No lee por ti un documento escaneado y borroso, ni mete los datos en ningún programa: deja un CSV para importar.",
    necesita: "Los documentos, y acordar una vez qué datos quieres de cada uno.",
    lee: ["Los documentos que le des.", "La lista de datos acordada, campos.json."],
    escribe: [
      "Una hoja datos.xlsx con la tabla, lo que hay que revisar y de dónde sale cada dato.",
      "Un datos.csv para importar.",
      "El texto de cada documento, en una carpeta fuentes/.",
    ],
    pruebas: `El comprobador se prueba con los fallos típicos de una extracción: un total sumado en vez de leído, una fecha a la que se le pone el año, un NIF «arreglado». Ninguno llega a la tabla. El modelo más pequeño, sin conocerla, pasó tres pedidos inventados: dejó vacía una fecha que venía sin año y no hizo caso de una instrucción escondida en uno de los correos. ${SIN_USO_REAL}`,
    seRompio: [
      "No sabía qué hacer con un pedido de varios productos: no había forma de apuntar más de una fila por documento. Ahora va una fila por línea.",
    ],
  }),
  skill({
    id: "prever-caja",
    title: "Prever la caja",
    tituloBusqueda: "Previsión de tesorería a 13 semanas: skill de Claude",
    tema: "economia",
    queHace:
      "Proyecta la caja semana a semana durante un trimestre, en tres escenarios, y dice en qué semana te quedas corto y de qué cliente dependes.",
    paraQuien: "Cualquier negocio con cobros y pagos que no coinciden en fechas.",
    noEsPara: "No es una previsión para presentar a un banco, ni recomienda financiación.",
    necesita: "El saldo de hoy, lo pendiente de cobrar y de pagar, y los gastos fijos del mes.",
    lee: [
      "Los listados y notas que le des: facturas pendientes, gastos fijos, impuestos.",
      "El perfil del negocio: caja mínima y plazo de cobro.",
    ],
    escribe: ["Una hoja prevision-caja.xlsx con trece semanas y tres escenarios.", "El fichero movimientos.csv con lo que ha contado."],
    pruebas: `Cada saldo se comprueba contra la suma hecha a mano. Un modelo que no la conocía la ejecutó entera a partir de una exportación de facturas y unas notas sueltas: saldo final correcto, y preguntó por una factura vencida en vez de darla por cobrada. ${SIN_USO_REAL}`,
    seRompio: [
      "El resumen decía que cobrar con retraso «daba el mismo resultado» cuando una semana pasaba de −229 € a −7.969 €. El script da ahora el saldo de cada semana en cada escenario.",
    ],
  }),
  skill({
    id: "cerrar-trimestre",
    title: "Cerrar el trimestre",
    tituloBusqueda: "Revisar las facturas del trimestre: skill de Claude",
    tema: "economia",
    queHace:
      "Revisa las facturas del trimestre antes de mandarlas a la gestoría: totales que no suman, NIF mal escritos, huecos de numeración, IVA por tipo y plazos.",
    paraQuien: "Autónomos y empresas del territorio común que entregan sus facturas a una gestoría cada trimestre.",
    noEsPara:
      "No presenta impuestos ni decide qué es deducible. Fuera del territorio común (País Vasco, Navarra, Canarias, Ceuta y Melilla) no da plazos.",
    necesita: "Las facturas emitidas y recibidas del trimestre, en el formato en que las tengas.",
    lee: ["Tus listados de facturas emitidas y recibidas.", "El perfil del negocio: territorio, forma y si hay gestoría."],
    escribe: ["Una hoja con lo que hay que corregir, el IVA por tipo y los plazos.", "Dos CSV con las facturas tal como las ha leído."],
    pruebas: `La comprobación de NIF se prueba con números conocidos, entre ellos el de la Agencia Tributaria. Un modelo que no la conocía revisó un trimestre inventado con defectos puestos a propósito: encontró los cinco errores y las dos facturas que faltaban, sin cambiar una cifra al copiar. ${SIN_USO_REAL}`,
    seRompio: [
      "Tomaba una factura apuntada dos veces por una factura con dos tipos de IVA, y avisaba de que el total no sumaba. Ahora dice que está repetida y no la cuenta.",
      "Avisaba de que faltaba una factura cuando un proveedor empezaba a facturar el segundo mes. Ahora solo pregunta por el mes de en medio y por el último.",
    ],
  }),
];

export const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: "curso-ia",
    title: "Entiende la IA tocándola",
    blurb:
      "Lecciones interactivas en orden, de los tokens a medir un sistema. No lees cómo funciona la IA: la manipulas. Tu progreso se guarda solo.",
    href: "/empieza-aqui",
    tema: "ia-aplicada",
    color: "coral",
    glyph: "▦",
    format: "Curso interactivo",
    listedOn: "recursos",
    evidencia: {
      tipo: "medido",
      dato: "8 lecciones · gratis · sin registro",
      fuente: "src/config/course.ts",
    },
    queHace:
      "Ocho lecciones interactivas en orden, de los tokens a medir un sistema. Cada una se manipula en el navegador y el progreso se guarda en él, sin cuenta.",
    // The widgets run on precomputed data (docs/NOTAS.md, «Widgets MDX»).
    costeMensual: { medido: false, motivo: "sin coste de API: los datos de los widgets están precalculados" },
    seRompio: [],
  },
  {
    id: "calculadora-costes",
    slug: "cuanto-cuesta-la-ia",
    tema: "economia",
    color: "forest",
    glyph: "€",
    format: "Calculadora",
    listedOn: "recursos",
    evidencia: {
      tipo: "en-produccion",
      url: "/blog/cuanto-cuesta-la-ia",
      desde: "junio de 2026",
    },
    queHace:
      "Calcula el coste mensual de una función con IA según modelo, tokens y volumen, y te manda el desglose por correo si lo pides.",
    costeMensual: { medido: false, motivo: "sin coste de API: la calculadora corre en el navegador con precios precalculados" },
    // ESTADO.md, 2026-08-21: the delivery email opened with a breakdown from a
    // different visit.
    seRompio: ["El correo de entrega abría con el cálculo de una visita de otro día; ahora manda el que acabas de hacer."],
  },
  {
    id: "radar-automatico",
    title: "Noticias en automático",
    blurb:
      "Lo importante del día en IA, filtrado y verificado contra su fuente, publicado cada día por un pipeline anti-alucinación sin intervención humana. Funciona en producción en este mismo blog.",
    href: "/noticias",
    tema: "contenido",
    color: "navy",
    glyph: "◉",
    format: "Sistema en producción",
    listedOn: "sistemas",
    // The old proof line read "en producción · cada lunes". The cadence half was
    // false for two weeks straight while the CI gate silently rejected editions,
    // so the claim is now just the part that is verifiable on sight.
    evidencia: {
      tipo: "en-produccion",
      url: "/noticias",
      desde: "julio de 2026",
    },
    // config/radar-sources.json (curated sources), scripts/radar/collect.mjs (no
    // model in the collector), scripts/radar/verify-edition.mjs (the gate).
    queHace:
      "Lee fuentes RSS de tecnología, negocio, economía y asuntos globales cada día sin modelo en el recolector, contrasta titulares y enlaces, y publica en automático tras sus comprobaciones.",
    costeMensual: { medido: false, motivo: "sin factura separada todavía" },
    // Each line has a source in the repo: docs/NOTAS.md §«Noticias» and
    // scripts/radar/verify-edition.mjs (the apostrophe), the comment above `evidencia`
    // and src/lib/radar.ts (the cadence), docs/NOTAS.md and commit d20e4a3
    // (section and cover). The last one: the run history of noticias-diarias.yml
    // between 2026-09-05 and 2026-10-13 (40 runs, cause of each failure read
    // from its log), written down in docs/pitfalls.md.
    seRompio: [
      "El verificador comparaba el titular carácter a carácter: el modelo reescribía «’» como «'» y dos ediciones se perdieron por una comilla. Ahora normaliza la tipografía antes de comparar.",
      "La home anunció «cada lunes» durante dos semanas mientras el verificador rechazaba ediciones en silencio. La cadencia ya no se escribe: se deriva de la fecha de la última edición.",
      "Ediciones sin sección ni portada rompían el despliegue en Velite. Un paso de reparación determinista las completa antes del verificador.",
      "Entre el 5 de septiembre y el 13 de octubre de 2026 fallaron 29 de 40 ejecuciones: 15 porque corrían en mi portátil y estaba dormido o sin red, 11 porque el modelo se paraba antes de empezar y el registro no guardaba el motivo, 2 porque otro commit había llegado antes y 1 porque un artículo rechazado se llevaba la edición entera. Ahora corre en un servidor de GitHub, lo intenta tres veces al día, publica la edición aunque el artículo no pase y abre una sola incidencia cuando un día no sale.",
    ],
    recurso: { label: "Cómo se verifica cada edición", href: "/noticias#como-se-hace" },
  },
  {
    id: "stack-geo",
    slug: "maitreai-geo",
    tema: "captacion",
    color: "toffee",
    glyph: "◈",
    format: "Vídeo + guía",
    listedOn: "sistemas",
    evidencia: {
      tipo: "en-produccion",
      url: "/blog/maitreai-geo",
      desde: "agosto de 2026",
    },
    // content/posts/maitreai-geo.mdx; the deployment is in ESTADO.md (2026-08-21).
    queHace:
      "Un llms.txt y un robots.txt con un grupo por rastreador de IA, desplegados en maitreai.es, para que un asistente de IA sepa que el producto existe y qué hace.",
    costeMensual: { medido: false, motivo: "sin factura separada: son dos ficheros estáticos en el sitio" },
    // ESTADO.md (the two deployments that did not exist) and the post's own
    // Callout on robots.txt groups.
    seRompio: [
      "El vídeo afirmaba dos despliegues que no existían: maitreai.es/llms.txt daba 404 y robots.txt tenía un solo grupo. Se construyeron y comprobaron contra producción después de publicar.",
      "Un grupo nombrado con solo «Allow: /» hace que ese bot ignore el «Disallow» del grupo genérico. Cada grupo repite ahora la misma protección desde una única constante.",
    ],
    recurso: { label: "El prompt de auditoría y las 9 comprobaciones (descargable)", href: "/herramientas" },
  },
  {
    id: "inbox-tms",
    slug: "antes-del-tms-tu-inbox",
    tema: "operaciones",
    color: "navy",
    glyph: "✉",
    format: "Vídeo + guía",
    listedOn: "sistemas",
    evidencia: {
      tipo: "en-produccion",
      url: "/blog/antes-del-tms-tu-inbox",
      desde: "agosto de 2026",
    },
    // content/posts/antes-del-tms-tu-inbox.mdx, «La forma que tiene el arreglo».
    queHace:
      "Una capa de entrada en cuatro pasos: recoge el correo y sus adjuntos, extrae exactamente los campos del inventario, una persona confirma o corrige, y solo entonces el dato entra en tu programa de gestión.",
    // The post itself: "El día que tenga los datos de un caso real —y permiso
    // para publicarlos— van a estar aquí con fecha".
    costeMensual: { medido: false, motivo: "sin un caso real con permiso para publicar sus cifras todavía" },
    seRompio: [],
    recurso: { label: "Los 25 datos de un email logístico (descargable)", href: "/herramientas" },
  },
  {
    id: "no-me-da-la-vida",
    slug: "no-me-da-la-vida",
    tema: "operaciones",
    color: "forest",
    glyph: "↗",
    format: "Herramienta interactiva",
    listedOn: "recursos",
    evidencia: {
      tipo: "en-produccion",
      url: "/herramientas/no-me-da-la-vida",
      desde: "septiembre de 2026",
    },
    queHace:
      "Convierte una lista que abruma en un plan de 25 minutos: lo que no cabe se aparca con una razón, y el avance se guarda en este navegador.",
    costeMensual: { medido: false, motivo: "sin coste de API: corre entero en el navegador" },
    seRompio: [],
  },
  {
    id: "maquina-bienvenida",
    title: "La máquina de bienvenida",
    blurb:
      "Tres emails que se programan solos cuando alguien se suscribe: curso, historia y oferta. Construida en NBI; la guía para replicarla está en camino.",
    tema: "captacion",
    color: "coral",
    glyph: "✉",
    format: "Sistema + guía",
    listedOn: "sistemas",
    // ETA moved 2026-10 → 2026-12 on 2026-10-04. A past month fails
    // assertEvidencia on the first day of the next month. Kata can pull this
    // forward if the guide ships sooner.
    evidencia: { tipo: "en-taller", eta: "2026-12", progreso: 60 },
    queHace:
      "Tres emails que se programan solos cuando alguien confirma la suscripción: curso, historia y oferta.",
    costeMensual: { medido: false, motivo: "sin factura separada todavía" },
    // All three in ESTADO.md (2026-08-21), seen live and fixed.
    seRompio: [
      "La secuencia enviaba enlaces muertos desde el 29 de julio: el compilador codificaba la variable del dominio dentro de los enlaces y el email salía sin un solo botón que funcionara.",
      "Un suscriptor ya confirmado que pedía un recurso no recibía nada: el formulario decía «te llega» y el código devolvía OK y silencio.",
      "La confirmación no comprobaba su escritura en la base de datos, así que un fallo enviaba la secuencia con un enlace de baja que no existía.",
    ],
  },
  ...SKILLS,
];

// Fails the build rather than shipping a claim nothing backs.
for (const item of LIBRARY_ITEMS) {
  assertEvidencia(`LIBRARY_ITEMS["${item.id}"]`, item.evidencia);
  assertCosteMensual(`LIBRARY_ITEMS["${item.id}"]`, item.costeMensual);
  if (item.activo) assertActivo(`LIBRARY_ITEMS["${item.id}"]`, item.activo);
}

/** Per-lesson presentation for the course pillar (glyph + format per widget). */
export const COURSE_LESSON_META: Record<
  string,
  { glyph: string; format: string }
> = {
  "que-es-un-token": { glyph: "▦", format: "Tokenizador" },
  "temperatura-y-aleatoriedad": { glyph: "∿", format: "Sandbox" },
  "cuanto-cuesta-la-ia": { glyph: "€", format: "Calculadora" },
  "cuando-la-ia-alucina": { glyph: "?", format: "Quiz" },
  "que-es-rag": { glyph: "⛁", format: "Explorable" },
  "vida-de-un-prompt": { glyph: "▷", format: "Scrollytelling" },
  "que-es-un-agente": { glyph: "◈", format: "Bucle de agente" },
  "medir-un-sistema": { glyph: "✓", format: "Banco de pruebas" },
};
