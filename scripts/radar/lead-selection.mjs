/**
 * Lead selection — which story gets today's article.
 *
 * Rule from the editorial spec: pick by relevance to AI, controversy/impact,
 * work or business; recency only breaks ties. Candidates whose source text is
 * not sufficient are never eligible, however relevant: no full text, no new
 * lead article. Deterministic and model-free, so the choice is reproducible
 * and testable.
 */

/** Themes matched on title + summary; AI carries higher weight so core AI stories lead. */
const THEMES = [
  {
    key: "ia",
    weight: 4,
    re: /\b(ai|artificial intelligence|llm|gpt|claude|gemini|models?|agents?|copilot|inteligencia artificial|modelos?|agentes?|automation|automatizaci[oó]n|cybersecurity|ciberseguridad|software)\b/i,
  },
  {
    key: "trabajo",
    weight: 1,
    re: /\b(work|workers?|jobs?|employees?|staff|workplace|labou?r|hiring|layoffs?|productivity|trabajo|empleo|empleados?|plantilla)\b/i,
  },
  {
    key: "negocio",
    weight: 1,
    re: /\b(business|businesses|enterprise|companies|company|revenue|pricing|customers?|startups?|invest(s|ed|ment)?|funding|acquir(e|es|ed)|acquisition|market|small businesses|entrepreneurs?|founders?|negocio|empresas?|pymes|aut[oó]nomos?|ingresos|inversi[oó]n|emprendimiento|fundadores?)\b/i,
  },
  {
    key: "economia",
    weight: 1,
    re: /\b(econom(y|ic)|inflation|interest rates?|central bank|gdp|trade|tariffs?|exports?|export controls?|sanctions|supply chain|shipping routes?|energy prices?|cost of living|recession|econom[ií]a|inflaci[oó]n|tipos de inter[eé]s|banco central|comercio|exportaciones?|controles? de exportaci[oó]n|sanciones|cadena de suministro|rutas? mar[ií]timas|precios de la energ[ií]a|costes?|recesi[oó]n)\b/i,
  },
];

/**
 * Controversy and high-impact signals matched on title + summary.
 * Each category adds +1 when the story already matches at least one theme.
 */
const CONTROVERSY_SIGNALS = [
  {
    key: "regulacion_sancion",
    re: /\b(ban(s|ned)?|prohib[ei]|lawsuit|sued|demanda|litig|antitrust|monopol|oligopol|ftc|doj|fbi|capitol|congress|senate|investigat|investigaci[oó]n|fine[ds]?|multa[ds]?|sanction|sanci[oó]n|regulat|regulaci[oó]n|eu ai act|ley de ia|tariff|arancel)\b/i,
  },
  {
    key: "derechos_seguridad",
    re: /\b(copyright|derechos de autor|pirac|steal|stole|robo|guilty|culpable|breach|leak|filtraci[oó]n|hack|cyberattack|ciberataque|vulnerab|privacy|privacidad|deepfake|fraud|fraude|scam|estafa|safety|seguridad)\b/i,
  },
  {
    key: "impacto_mercado",
    re: /\b(layoffs?|despidos?|strike|huelga|resign|dimisi[oó]n|fired|despedid|sell-?off|crash|plunge|ca[ií]da|drop|volatil|crisis|backlash|criticism|controvers|pol[eé]mic|boycott|revolt|warning|advertencia|risk|riesgo)\b/i,
  },
];

// Note: `axis` never adds or subtracts points so stories from geopolitics,
// business, tech or AI compete strictly on title + summary content.

/** Which themes an item touches, for the frontmatter `relevancia`. */
export function themesOf(item) {
  const haystack = `${item.title ?? ""} ${item.summary ?? ""}`;
  return THEMES.filter((t) => t.re.test(haystack)).map((t) => t.key);
}

/** Which controversy/high-impact categories an item matches. */
export function controversySignalsOf(item) {
  const haystack = `${item.title ?? ""} ${item.summary ?? ""}`;
  return CONTROVERSY_SIGNALS.filter((s) => s.re.test(haystack)).map((s) => s.key);
}

export function relevanceScore(item) {
  const haystack = `${item.title ?? ""} ${item.summary ?? ""}`;
  const matchedThemes = THEMES.filter((t) => t.re.test(haystack));
  if (matchedThemes.length === 0) return 0;
  const themeScore = matchedThemes.reduce((sum, t) => sum + t.weight, 0);
  const controversyScore = CONTROVERSY_SIGNALS.filter((s) => s.re.test(haystack)).length;
  return themeScore + controversyScore;
}

/**
 * Eligible items ranked by relevance/controversy score (desc), then publishedAt (newest first).
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
 * @returns {{ status: "lead", lead: object, themes: string[], importancia: number, senales: string[] } | { status: "insufficient", reason: string, considered: number }}
 */
export function pickLead(items) {
  const ranked = rankLeads(items);
  if (ranked.length > 0) {
    const lead = ranked[0];
    return {
      status: "lead",
      lead,
      themes: themesOf(lead),
      importancia: relevanceScore(lead),
      senales: controversySignalsOf(lead),
    };
  }
  const reasons = [...new Set(items.map((i) => i.textStatus?.reason ?? "not-fetched"))];
  return {
    status: "insufficient",
    reason: items.length === 0 ? "no-candidates" : `no eligible source (${reasons.join(", ")})`,
    considered: items.length,
  };
}
