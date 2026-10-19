import { getEditoriales, zonasConContenido } from "@/lib/posts";
import { feeds, footerLinks, navLinks, siteConfig } from "@/config/site";
import { ESTANTES, RUTA_POR_ESTANTE, type Estante } from "@/config/taxonomy";
import { ACTIVOS } from "@/lib/catalogo";
import { CATALOGO_REPO_URL } from "@/config/catalogo";

/**
 * /llms.txt — the curated site map for LLMs (llmstxt.org v2 spec).
 *
 * The decision this file closes was open since episode 1 stopped needing the
 * 404 as its "before" shot: `docs/geo-checklist.md` said "don't invest in
 * llms.txt", citing Ahrefs, and that reason was about *investing*. The settled
 * position (2026-08-21): Google ignores the file, but OpenAI and Microsoft
 * crawlers fetch it and the cost is one static route — a low-cost,
 * asymmetric-upside experiment. The site teaches exactly this in
 * /blog/maitreai-geo, so not shipping it here was an absence without a reason.
 *
 * Rules for editing:
 * - Every URL absolute, from `siteConfig.url` — agents follow links from here
 *   without knowing the domain's origin.
 * - No claims the evidence system could not back: this file describes what
 *   exists, never what is planned (the "en el taller" items stay out).
 * - Keep it small enough to fit in a context window; the site's depth lives
 *   behind the links, not in this file.
 * - Link order is the site's own: systems first, then the archive, the news,
 *   the resources, and the footer destinations. Labels and paths come from
 *   `navLinks` / `footerLinks`; only the one-line descriptions live here, and
 *   a destination with no description here is left out rather than guessed.
 */
export const dynamic = "force-static";

const DESCRIPTIONS: Record<string, string> = {
  "/marketplace":
    "seis skills en español para el trabajo de oficina de un negocio, para Claude, Codex y cualquier agente compatible con Agent Skills, cada una con su ficha: qué lee, qué escribe, cómo se ha probado y cómo se instala en cada agente.",
  "/sistemas":
    "los sistemas de IA que ya funcionan en mi negocio: qué hace cada uno, sus números y lo que se rompió.",
  "/blog":
    "el archivo de lo escrito a mano — sistemas, casos reales, notas y lecciones. No incluye las noticias automáticas.",
  "/noticias":
    "lo importante del día en IA, tecnología y negocio, filtrado y verificado contra su fuente por un pipeline en automático. Son resúmenes hechos con IA que el autor no revisa antes de publicarse, y no llevan su firma.",
  "/herramientas":
    "herramientas listas para usar — curso, calculadora de costes, planificador, prompt de auditoría GEO y checklist de datos logísticos. Los descargables se entregan por email con doble opt-in.",
  "/empieza-aqui":
    "lecciones gratuitas en orden, con widgets interactivos (tokenizador, sandbox de temperatura, calculadora de costes). Sin registro.",
  "/glosario":
    "términos de IA explicados sin rodeos, con el artículo donde se desarrollan.",
  "/newsletter": "las ediciones enviadas, en versión web.",
  "/bitacora":
    "lo que construyo, fecha a fecha: lanzamientos, mejoras y arreglos del blog, las skills, las noticias, el canal y MaitreAI, cada uno con el enlace donde se comprueba.",
  "/videos":
    "los vídeos del canal de YouTube: episodios donde monto un sistema de IA de principio a fin, con su artículo cuando lo tiene.",
  "/sobre-mi": "quién escribe, y por qué lo publica gratis.",
};

/**
 * The shelves whose page only exists while it has content. Listed right after
 * the systems and asked for through `zonasConContenido`, whether or not the
 * nav links them: an empty one answers 404.
 */
const ZONA_DESCRIPTIONS: Partial<Record<Estante, string>> = {
  guias:
    "respuestas a lo que se pregunta quien quiere aplicar IA en su negocio —costes, instalación, comparativas—, con la fuente de cada dato.",
  reflexiones:
    "lo que pienso mientras lo construyo: decisiones, dudas y lecturas de la actualidad, firmadas y escritas a mano.",
};

/** Noticias, Marketplace, Herramientas, Archivo, Sistemas, Vídeos, Bitácora, Curso, Glosario, Newsletter. */
const CONTENT_ORDER = [
  "/noticias",
  "/marketplace",
  "/herramientas",
  "/blog",
  "/sistemas",
  "/videos",
  "/bitacora",
  "/empieza-aqui",
  "/glosario",
  "/newsletter",
];

export function GET() {
  const url = siteConfig.url;
  // Editorial only, newest first: "the latest article" is never a news edition.
  const newestPost = getEditoriales()[0];
  const links = [...navLinks, ...footerLinks];
  const line = (href: string) => {
    const link = links.find((item) => item.href === href);
    return link && DESCRIPTIONS[href]
      ? `- [${link.label}](${url}${href}): ${DESCRIPTIONS[href]}`
      : null;
  };

  const zonas = zonasConContenido().flatMap((estante) =>
    ZONA_DESCRIPTIONS[estante]
      ? [`- [${ESTANTES[estante]}](${url}${RUTA_POR_ESTANTE[estante]}): ${ZONA_DESCRIPTIONS[estante]}`]
      : [],
  );
  const [primera, ...resto] = CONTENT_ORDER;

  const body = `# ${siteConfig.name}

> ${siteConfig.tagline} — blog y newsletter en español sobre IA aplicada a un negocio: cada sistema documentado con sus números y con lo que se rompió, un curso interactivo de IA y las Noticias de IA cada día. Autor: ${siteConfig.author.name}.

Este sitio publica en español. Su audiencia es ${siteConfig.audience}: cada sistema documentado incluye qué hace, cómo está montado y qué se rompió. Las afirmaciones son verificables por diseño.

## Contenido

${[line(primera), ...zonas, ...resto.map(line)].filter(Boolean).join("\n")}
${newestPost ? `- [Último artículo: ${newestPost.title}](${url}${newestPost.permalink}): ${newestPost.description}\n` : ""}
${
  ACTIVOS.length > 0
    ? `## Skills instalables

Skills en español (formato Agent Skills, licencia MIT) que hacen trabajo de oficina de un negocio con un agente de IA (la aplicación de Claude, Claude Code, Codex, OpenCode o cualquiera que lea Agent Skills): cada una lleva sus instrucciones y un script en Python sin dependencias, y las que hacen cuentas dejan una hoja de cálculo. Repositorio: ${CATALOGO_REPO_URL}

${ACTIVOS.map((item) => `- [${item.title}](${url}${item.href}): ${item.queHace}`).join("\n")}

`
    : ""
}## Identidad

${[
  line("/sobre-mi"),
  `- Autor: ${siteConfig.author.name}`,
  `- Contacto: ${siteConfig.contactEmail}`,
  `- RSS: ${url}${feeds.editorial.href}`,
  `- RSS de las noticias: ${url}${feeds.noticias.href}`,
  `- Política de privacidad: ${url}/privacidad`,
]
  .filter(Boolean)
  .join("\n")}
`;

  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
