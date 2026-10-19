/**
 * Funnel numbers for the panel.
 *
 * Aggregated in TypeScript over plain selects rather than in SQL. With a list in
 * the tens that is the right call: no migration, no SECURITY DEFINER function to
 * audit, no view to keep in sync. The row cap below is the tripwire for when that
 * stops being true.
 *
 * Reads with `service_role`, which bypasses RLS. That is fine here and only here:
 * the panel is behind a password and runs server-side.
 */

import type { createAdminClient } from "@/lib/supabase/admin";
import { COST_MAGNET_SLUG } from "@/lib/cost-model";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Above this, move the aggregation into an RPC. Selecting every subscriber to
 * count them in JS is honest at 50 rows and wrong at 50.000.
 */
const ROW_CAP = 5000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type WeekRow = { week: string; altas: number; confirmadas: number };
export type CountRow = { label: string; count: number };
export type StepRow = { key: string; enviados: number; pendientes: number };

export type Funnel = {
  truncated: boolean;
  total: number;
  porEstado: { pending: number; confirmed: number; unsubscribed: number };
  /** Ever-confirmed ÷ total. Unsubscribing requires having confirmed first. */
  tasaConfirmacion: number | null;
  semanas: WeekRow[];
  porSignupPath: CountRow[];
  porSource: CountRow[];
  calculadora: { desglosesPedidos: number; direcciones: number; confirmadas: number };
  secuencia: StepRow[];
  bajas30d: number;
};

/** Monday of the ISO week containing `d`, as YYYY-MM-DD. */
function weekStart(d: Date): string {
  const copy = new Date(d);
  const day = (copy.getUTCDay() + 6) % 7; // Monday = 0
  copy.setUTCDate(copy.getUTCDate() - day);
  return copy.toISOString().slice(0, 10);
}

function topBy(
  rows: { value: string | null }[],
  limit: number,
): CountRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.value?.trim() || "(sin dato)";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export async function getFunnel(
  supabase: AdminClient,
  now = new Date(),
): Promise<Funnel> {
  const [subsRes, magnetRes, stepsRes] = await Promise.all([
    supabase
      .from("subscribers")
      .select("created_at, status, source, signup_path, unsubscribed_at")
      .order("created_at", { ascending: false })
      .limit(ROW_CAP),
    supabase
      .from("lead_magnet_submissions")
      .select("email, magnet_slug")
      .eq("magnet_slug", COST_MAGNET_SLUG)
      .limit(ROW_CAP),
    supabase.from("scheduled_emails").select("email_key, scheduled_at").limit(ROW_CAP),
  ]);

  const subs = subsRes.data ?? [];
  const magnets = magnetRes.data ?? [];
  const steps = stepsRes.data ?? [];

  const porEstado = { pending: 0, confirmed: 0, unsubscribed: 0 };
  for (const s of subs) {
    const status = s.status as keyof typeof porEstado;
    if (status in porEstado) porEstado[status] += 1;
  }
  const everConfirmed = porEstado.confirmed + porEstado.unsubscribed;

  // Last 12 weeks, including empty ones — a gap in the cadence is information,
  // and omitting the row hides it.
  const semanas: WeekRow[] = [];
  for (let i = 11; i >= 0; i--) {
    const ref = new Date(now.getTime() - i * 7 * MS_PER_DAY);
    const week = weekStart(ref);
    const inWeek = subs.filter((s) => weekStart(new Date(s.created_at as string)) === week);
    semanas.push({
      week,
      altas: inWeek.length,
      confirmadas: inWeek.filter((s) => s.status !== "pending").length,
    });
  }

  const magnetEmails = new Set(magnets.map((m) => (m.email as string).toLowerCase()));

  // Match magnet addresses against confirmed subscribers. `subscribers.email` is
  // not selected above (it is PII we do not need for any other number), so this
  // one comparison fetches just the addresses it needs.
  let confirmadasDeCalculadora = 0;
  if (magnetEmails.size > 0) {
    const { data } = await supabase
      .from("subscribers")
      .select("email, status")
      .in("email", [...magnetEmails])
      .limit(ROW_CAP);
    confirmadasDeCalculadora = (data ?? []).filter(
      (s) => s.status === "confirmed" || s.status === "unsubscribed",
    ).length;
  }

  const byKey = new Map<string, { enviados: number; pendientes: number }>();
  for (const step of steps) {
    const key = step.email_key as string;
    const entry = byKey.get(key) ?? { enviados: 0, pendientes: 0 };
    if (new Date(step.scheduled_at as string).getTime() <= now.getTime()) entry.enviados += 1;
    else entry.pendientes += 1;
    byKey.set(key, entry);
  }

  const cutoff = now.getTime() - 30 * MS_PER_DAY;

  return {
    truncated: subs.length >= ROW_CAP,
    total: subs.length,
    porEstado,
    tasaConfirmacion: subs.length > 0 ? everConfirmed / subs.length : null,
    semanas,
    porSignupPath: topBy(
      subs.map((s) => ({ value: s.signup_path as string | null })),
      15,
    ),
    porSource: topBy(
      subs.map((s) => ({ value: s.source as string | null })),
      15,
    ),
    calculadora: {
      desglosesPedidos: magnets.length,
      direcciones: magnetEmails.size,
      confirmadas: confirmadasDeCalculadora,
    },
    secuencia: [...byKey.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    bajas30d: subs.filter(
      (s) => s.unsubscribed_at && new Date(s.unsubscribed_at as string).getTime() >= cutoff,
    ).length,
  };
}
