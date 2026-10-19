/**
 * The arithmetic behind the cost calculator, extracted from the widget.
 *
 * This file has no `"use client"` on purpose. The capture flow stores what a
 * reader calculated and the first onboarding email quotes it back, so both the
 * route handler and the email renderer need these numbers — and neither can
 * import a client component to get them.
 *
 * The server never trusts the figures the browser sends: it re-runs
 * `computeCost` over the validated inputs. An email that quotes a price is
 * making a claim, and a claim assembled from client-supplied numbers is a claim
 * nothing backs.
 */

/**
 * The day the prices below were read, and where. A price without a date is a
 * guess that looks like a fact: until 13 Oct 2026 this table said "Claude
 * Haiku, $0.80 / $4" with no version and no date, which by then was the price
 * of a retired model (Haiku 3.5) — the current one cost an eighth of that.
 *
 * To update: read both pages, change the rows and this date in the same commit.
 * tests/calculadora-costes.test.ts fails once the date is older than
 * `COST_PRICES_MAX_AGE_DAYS`, and names what to do.
 */
export const COST_PRICES_CHECKED = "2026-10-15";
export const COST_PRICES_MAX_AGE_DAYS = 120;

export const COST_PRICE_SOURCES = [
  { proveedor: "Anthropic", url: "https://platform.claude.com/docs/en/about-claude/pricing" },
  { proveedor: "OpenAI", url: "https://developers.openai.com/api/docs/pricing" },
] as const;

/**
 * List prices in $ per million tokens (input / output), named as each
 * provider's pricing page names the model. Standard tier, no caching, no batch
 * discount. Claude Haiku 5.5 is the price for prompts of up to 100,000 tokens;
 * the calculator's ceiling is 8,000.
 *
 * `anterior: true` marks what the calculator offered before that date. Those
 * rows are no longer in the selector, but they stay here with the price they
 * had: a calculation someone saved with one of them must still resolve when
 * the welcome email quotes it back (`readCostPayload`).
 */
export const COST_MODELS = [
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", in: 0.1, out: 0.5 },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", in: 2, out: 10 },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", in: 4, out: 20 },
  { id: "claude-fable-5-1", label: "Claude Fable 5.1", in: 10, out: 50 },
  { id: "gpt-6-luna", label: "gpt-6-luna", in: 0.1, out: 0.5 },
  { id: "gpt-6-1-sol", label: "gpt-6.1-sol", in: 2, out: 10 },
  { id: "gpt-6-astra", label: "gpt-6-astra", in: 10, out: 50 },
  { id: "gpt-4o-mini", label: "GPT-4o mini", in: 0.15, out: 0.6, anterior: true },
  { id: "gpt-4o", label: "GPT-4o", in: 2.5, out: 10, anterior: true },
  { id: "claude-haiku", label: "Claude Haiku", in: 0.8, out: 4, anterior: true },
  { id: "claude-sonnet", label: "Claude Sonnet", in: 3, out: 15, anterior: true },
] as const;

export type CostModel = (typeof COST_MODELS)[number];
export type CostModelId = CostModel["id"];

/** What the selector offers: the rows read on `COST_PRICES_CHECKED`. */
export const COST_MODELS_OFFERED = COST_MODELS.filter((m) => !("anterior" in m));

export const COST_MODEL_IDS = COST_MODELS.map((m) => m.id) as [
  CostModelId,
  ...CostModelId[],
];

/** Slider bounds — shared by the widget and by the server-side validation. */
export const COST_LIMITS = {
  inTok: { min: 0, max: 8000, step: 100 },
  outTok: { min: 0, max: 4000, step: 100 },
  reqs: { min: 0, max: 50000, step: 100 },
} as const;

export const COST_DEFAULTS = {
  modelId: "claude-haiku-5-5" as CostModelId,
  inTok: 800,
  outTok: 400,
  reqs: 1000,
};

export type CostInputs = typeof COST_DEFAULTS;

export type CostResult = {
  model: CostModel;
  perReq: number;
  perDay: number;
  perMonth: number;
};

/**
 * Same expression, same order of operations as the widget used inline, so the
 * numbers stay bit-for-bit identical to what the reader saw on screen.
 */
export function computeCost(inputs: CostInputs): CostResult {
  const model = COST_MODELS.find((m) => m.id === inputs.modelId) ?? COST_MODELS[0];
  const perReq = (inputs.inTok * model.in + inputs.outTok * model.out) / 1_000_000;
  const perDay = perReq * inputs.reqs;
  const perMonth = perDay * 30;
  return { model, perReq, perDay, perMonth };
}

/** The three figures as the widget formats them, for reuse in the email. */
export function formatCost(result: CostResult) {
  return {
    perReq: `$${result.perReq.toFixed(5)}`,
    perDay: `$${result.perDay.toFixed(2)}`,
    perMonth: `$${result.perMonth.toFixed(0)}`,
  };
}

/** The magnet slug this calculator captures under. */
export const COST_MAGNET_SLUG = "calculadora-coste-ia";

/**
 * Narrow an untrusted object to `CostInputs`, or null.
 *
 * Used by the route handler before recomputing. Bounds mirror the sliders, so a
 * payload that could not have come from the UI is rejected rather than stored.
 */
export function parseCostInputs(value: unknown): CostInputs | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;

  const modelId = raw.modelId;
  if (typeof modelId !== "string") return null;
  if (!COST_MODELS.some((m) => m.id === modelId)) return null;

  const bounded = (v: unknown, limits: { min: number; max: number }): number | null => {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    if (!Number.isInteger(v)) return null;
    if (v < limits.min || v > limits.max) return null;
    return v;
  };

  const inTok = bounded(raw.inTok, COST_LIMITS.inTok);
  const outTok = bounded(raw.outTok, COST_LIMITS.outTok);
  const reqs = bounded(raw.reqs, COST_LIMITS.reqs);
  if (inTok === null || outTok === null || reqs === null) return null;

  return { modelId: modelId as CostModelId, inTok, outTok, reqs };
}
