/**
 * Lead selection — which story gets today's article.
 *
 * Rule from the editorial spec: pick by relevance to AI, work or business;
 * recency only breaks ties. Candidates whose source text is not sufficient are
 * never eligible, however relevant: no full text, no new lead article.
 * Deterministic and model-free, so the choice is reproducible and testable.
 */

/** Themes matched on title + summary; each theme counts once. */
const THEMES = [
  { key: "ia", re: /\b(ai|artificial intelligence|llm|gpt|claude|gemini|models?|agents?|copilot|inteligencia artificial|modelos?|agentes?|automation|automatizaci[oó]n|cybersecurity|ciberseguridad|software)\b/i },
  { key: "trabajo", re: /\b(work|workers?|jobs?|employees?|staff|workplace|labou?r|hiring|layoffs?|productivity|trabajo|empleo|empleados?|plantilla)\b/i },
  { key: "negocio", re: /\b(business|businesses|enterprise|companies|company|revenue|pricing|customers?|startups?|invest(s|ed|ment)?|funding|acquir(e|es|ed)|acquisition|market|small businesses|entrepreneurs?|founders?|negocio|empresas?|pymes|aut[oó]nomos?|ingresos|inversi[oó]n|emprendimiento|fundadores?)\b/i },
  { key: "economia", re: /\b(econom(y|ic)|inflation|interest rates?|central bank|gdp|trade|tariffs?|exports?|export controls?|sanctions|supply chain|shipping routes?|energy prices?|cost of living|recession|econom[ií]a|inflaci[oó]n|tipos de inter[eé]s|banco central|comercio|exportaciones?|controles? de exportaci[oó]n|sanciones|cadena de suministro|rutas? mar[ií]timas|precios de la energ[ií]a|costes?|recesi[oó]n)\b/i },
];

// There used to be a bonus per axis here, 1 for every axis but geopolitics: a
// story about export controls or a sanction could match as many themes as a
// product launch and still lose the tie. Every axis counts the same now, so
// the bonus is gone and the themes decide.

/** Which themes an item touches, for the frontmatter `relevancia`. */
export function themesOf(item) {
  const haystack = `${item.title ?? ""} ${item.summary ?? ""}`;
  return THEMES.filter((t) => t.re.test(haystack)).map((t) => t.key);
}

export function relevanceScore(item) {
  return themesOf(item).length;
}

/**
 * Eligible items ranked by relevance (desc), then publishedAt (newest first).
 * Eligible = full source text sufficient AND at least one theme matched.
 */
export function rankLeads(items) {
  return items
    .filter((item) => item.textStatus?.sufficient === true && themesOf(item).length > 0)
    .map((item) => ({ item, score: relevanceScore(item) }))
    .sort(
      (a, b) =>
        b.score - a.score || Date.parse(b.item.publishedAt) - Date.parse(a.item.publishedAt),
    )
    .map(({ item }) => item);
}

/**
 * @returns {{ status: "lead", lead: object, themes: string[] } | { status: "insufficient", reason: string, considered: number }}
 */
export function pickLead(items) {
  const ranked = rankLeads(items);
  if (ranked.length > 0) return { status: "lead", lead: ranked[0], themes: themesOf(ranked[0]) };
  const reasons = [...new Set(items.map((i) => i.textStatus?.reason ?? "not-fetched"))];
  return {
    status: "insufficient",
    reason: items.length === 0 ? "no-candidates" : `no eligible source (${reasons.join(", ")})`,
    considered: items.length,
  };
}
