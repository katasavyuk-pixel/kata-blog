/**
 * Lead magnet submissions — what a reader produced, kept so the first onboarding
 * email can hand it back.
 *
 * The rule this file exists to enforce: **the payload is recomputed on the
 * server**, never stored as the browser sent it. The welcome email quotes these
 * figures, and a quoted figure is a claim. Accepting client-supplied numbers
 * would let anyone put any price in an email that carries this site's name.
 *
 * Everything here is best-effort. A failure to record a submission must never
 * be the reason a subscription fails — same posture as the onboarding sequence.
 */

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  COST_MAGNET_SLUG,
  computeCost,
  formatCost,
  parseCostInputs,
} from "@/lib/cost-model";
import { PIEZAS, esPiezaConEmail } from "@/lib/piezas/registry";

type AdminClient = ReturnType<typeof createAdminClient>;

export type MagnetSubmission = {
  magnetSlug: string;
  payload: Record<string, unknown>;
  sourcePath: string | null;
};

/**
 * Turn an untrusted payload into the object we are willing to store.
 *
 * Returns null when the magnet is unknown or the inputs could not have come
 * from the UI — the submission is still recorded, just without figures.
 */
function normalisePayload(
  magnetSlug: string,
  raw: unknown,
): Record<string, unknown> | null {
  if (esPiezaConEmail(magnetSlug)) return normalisePiezaPayload(magnetSlug, raw);
  if (magnetSlug !== COST_MAGNET_SLUG) return null;

  const inputs = parseCostInputs(raw);
  if (!inputs) return null;

  const result = computeCost(inputs);
  return {
    inputs,
    model: { id: result.model.id, label: result.model.label },
    result: {
      perReq: result.perReq,
      perDay: result.perDay,
      perMonth: result.perMonth,
    },
    formatted: formatCost(result),
  };
}

/**
 * A piece's payload, dispatched by slug through the shared registry
 * (src/lib/piezas/registry.ts). Only the parsed inputs are kept — names cut to
 * length, scores bounded — and the computed result beside them for the panel.
 * The email does not read `result`: it recomputes from `inputs` again.
 */
function normalisePiezaPayload(
  slug: keyof typeof PIEZAS,
  raw: unknown,
): Record<string, unknown> | null {
  const modelo = PIEZAS[slug];
  const inputs = modelo.parse(raw);
  if (!inputs) return null;
  return { inputs, result: modelo.compute(inputs as never) };
}

export async function recordSubmission(
  supabase: AdminClient,
  input: {
    email: string;
    magnetSlug: string;
    payload?: unknown;
    sourcePath?: string;
  },
): Promise<void> {
  try {
    await supabase.from("lead_magnet_submissions").insert({
      email: input.email,
      magnet_slug: input.magnetSlug,
      payload: normalisePayload(input.magnetSlug, input.payload) ?? {},
      source_path: input.sourcePath ?? null,
    });
  } catch {
    // Table missing (migration 0005 unapplied) or transient failure — skip.
  }
}

/**
 * The most recent thing this address asked for, or null.
 *
 * Keyed by email rather than by a token in the confirm URL: the calculator gets
 * used on a desktop and the confirmation link gets opened on a phone often
 * enough that a cookie or a URL payload would lose the association exactly when
 * it matters. The email address is the one identifier present on both sides.
 */
export async function getLatestSubmission(
  supabase: AdminClient,
  email: string,
): Promise<MagnetSubmission | null> {
  try {
    const { data, error } = await supabase
      .from("lead_magnet_submissions")
      .select("magnet_slug, payload, source_path")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return {
      magnetSlug: data.magnet_slug as string,
      payload: (data.payload ?? {}) as Record<string, unknown>,
      sourcePath: (data.source_path as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Drop every submission for an address.
 *
 * Called on unsubscribe. There is no FK to `subscribers`, so nothing cascades:
 * without this, the figures we stored in order to email someone would outlive
 * their consent, and the privacy policy would be describing a deletion that
 * never happened. Also the query to run for an erasure request.
 */
export async function deleteSubmissions(
  supabase: AdminClient,
  email: string,
): Promise<void> {
  try {
    await supabase.from("lead_magnet_submissions").delete().eq("email", email);
  } catch {
    // Best-effort: never block the one-click unsubscribe response.
  }
}

/** Narrow a stored cost payload back to the shape the email renderer wants. */
export function readCostPayload(payload: Record<string, unknown>): {
  modelLabel: string;
  perReq: string;
  perDay: string;
  perMonth: string;
  inTok: number;
  outTok: number;
  reqs: number;
} | null {
  const inputs = parseCostInputs(payload.inputs);
  if (!inputs) return null;

  const result = computeCost(inputs);
  const formatted = formatCost(result);
  return {
    modelLabel: result.model.label,
    ...formatted,
    inTok: inputs.inTok,
    outTok: inputs.outTok,
    reqs: inputs.reqs,
  };
}
