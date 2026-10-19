/**
 * GEO audit — is the substantive text actually in the served HTML?
 *
 * AI crawlers frequently do not execute JavaScript. This site is full of client
 * islands, so the question that matters is not "does the page work" but "does the
 * explanatory prose around the widgets arrive without a browser". A widget that
 * hydrates is fine; a paragraph that only exists after hydration is invisible.
 *
 * No dependencies and no browser on purpose: using a headless browser here would
 * defeat the point, because it would run the JavaScript we are trying to prove is
 * unnecessary.
 *
 * Usage:
 *   node scripts/geo/audit-ssr.mjs                      # against localhost:3100
 *   node scripts/geo/audit-ssr.mjs https://kata.ianexora.com
 */

const base = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");

/**
 * One representative page per template, with a phrase that must be present.
 *
 * The phrases are deliberately taken from prose *next to* an interactive widget,
 * not from the header: a header renders server-side in almost any setup, so
 * checking it proves nothing.
 */
const PAGES = [
  { label: "home", path: "/", needs: ["Sistemas de IA que ya funcionan en un negocio pequeño", "Empieza por «Clasificar solicitudes entrantes»: suma 19 de 25."], minWords: 250 },
  { label: "artículo (lección)", path: "/blog/que-es-un-token", needs: ["no ve letras", "ventana de contexto"], minWords: 300 },
  { label: "artículo (calculadora)", path: "/blog/cuanto-cuesta-la-ia", needs: ["El modelo manda", "La salida pesa"], minWords: 200 },
  { label: "artículo (scrollytelling)", path: "/blog/vida-de-un-prompt", needs: ["No hay más misterio"], minWords: 120 },
  // Phase 4 pieces: each phrase comes from INSIDE the piece's default
  // server-rendered state (the «Ejemplo» result, the formula, the revealed
  // list), so a piece that only renders after hydration fails here.
  { label: "pieza (puntuador)", path: "/blog/que-proceso-automatizar-primero", needs: ["Empieza por «Clasificar solicitudes entrantes»: suma 19 de 25.", "Orden del ejemplo", "Coste del error + Revisión"], minWords: 800 },
  { label: "pieza (calculadora)", path: "/blog/antes-del-tms-tu-inbox", needs: ["660 × 8 ÷ 60 × 20 € = 1.760 €", "Referencia del cliente o número de pedido", "Origen del dato: quién lo dijo, en qué correo y cuándo", "Correo simulado", "Dato validado"], minWords: 1200 },
  { label: "pieza (lista)", path: "/blog/maitreai-geo", needs: ["2 de 9", "Siguiente: la 1, «Cada URL pública responde 200 y no redirige»."], minWords: 600 },
  { label: "edición del Radar", path: "/blog/radar-2026-08-04", needs: ["Nota editorial"], minWords: 400 },
  { label: "archivo", path: "/blog", needs: [], minWords: 100 },
  { label: "noticias", path: "/noticias", needs: [], minWords: 150 },
  { label: "curso", path: "/empieza-aqui", needs: [], minWords: 150 },
  { label: "sistemas", path: "/sistemas", needs: [], minWords: 200 },
  { label: "herramientas", path: "/herramientas", needs: ["Herramientas que puedes usar hoy"], minWords: 150 },
  { label: "glosario (término)", path: "/glosario/token", needs: [], minWords: 40 },
  { label: "sobre mí", path: "/sobre-mi", needs: [], minWords: 150 },
];

/** Crawlers that must not be blocked. Reported, never changed by this script. */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-Web",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
  "meta-externalagent",
];

/**
 * Strip the parts of the document that are not reading text.
 *
 * `<script>` goes first and matters most: Next embeds the whole React flight
 * payload in script tags, so counting words without removing them would "find"
 * every string twice and report a JS-only page as fine.
 */
function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<head\b[\s\S]*?<\/head>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function countJsonLd(html) {
  const blocks = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const types = [];
  let invalid = 0;
  for (const block of blocks) {
    const body = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    try {
      const parsed = JSON.parse(body);
      types.push(parsed["@type"] ?? "?");
    } catch {
      invalid++;
    }
  }
  return { types, invalid };
}

let problems = 0;

console.log(`\nGEO audit — ${base}\n${"─".repeat(78)}`);
console.log(
  `${"página".padEnd(26)}${"http".padEnd(6)}${"palabras".padEnd(10)}${"JSON-LD".padEnd(26)}texto`,
);

for (const page of PAGES) {
  let res;
  try {
    res = await fetch(`${base}${page.path}`, { redirect: "follow" });
  } catch (err) {
    console.log(`${page.label.padEnd(26)}${"ERR".padEnd(6)} ${err.message}`);
    problems++;
    continue;
  }

  const html = await res.text();
  const text = visibleText(html);
  const words = text.split(" ").filter(Boolean).length;
  const { types, invalid } = countJsonLd(html);

  const missing = page.needs.filter((phrase) => !text.includes(phrase));
  const thin = words < page.minWords;
  const noindex = /<meta[^>]+name="robots"[^>]+noindex/i.test(html);

  const flags = [];
  if (res.status !== 200) flags.push(`http ${res.status}`);
  if (thin) flags.push(`solo ${words} palabras (< ${page.minWords})`);
  if (missing.length) flags.push(`falta en el HTML: ${missing.map((m) => `"${m}"`).join(", ")}`);
  if (invalid) flags.push(`${invalid} JSON-LD no parseable`);
  if (noindex) flags.push("noindex");
  if (flags.length) problems++;

  console.log(
    `${page.label.padEnd(26)}${String(res.status).padEnd(6)}${String(words).padEnd(10)}` +
      `${(types.join(", ") || "—").padEnd(26)}${flags.length ? "✗ " + flags.join(" · ") : "✓"}`,
  );
}

// robots.txt — reported, not touched. A 404 here means nothing is blocked, which
// is the current (deliberate) state: the robots/llms stack is episode-1 content.
console.log(`\n${"─".repeat(78)}\nrobots.txt`);
const robotsRes = await fetch(`${base}/robots.txt`).catch(() => null);
if (!robotsRes || robotsRes.status === 404) {
  console.log(
    "  404 — no existe, así que NINGÚN crawler está bloqueado. Es el estado buscado:\n" +
      "  el stack robots/llms.txt es el contenido en cámara del episodio 1.",
  );
} else {
  const robots = await robotsRes.text();
  console.log(`  ${robotsRes.status} — comprobando los ${AI_CRAWLERS.length} crawlers de IA:`);
  for (const bot of AI_CRAWLERS) {
    const block = robots.match(
      new RegExp(`User-agent:\\s*${bot}\\s*\\n(?:(?!User-agent:)[\\s\\S])*`, "i"),
    )?.[0];
    const blocked = block ? /Disallow:\s*\/\s*$/im.test(block) : false;
    if (blocked) {
      console.log(`    ✗ ${bot} BLOQUEADO`);
      problems++;
    } else {
      console.log(`    ✓ ${bot}`);
    }
  }
}

console.log(`\n${problems === 0 ? "Sin problemas." : `${problems} cosas que mirar.`}\n`);
process.exit(problems === 0 ? 0 : 1);
