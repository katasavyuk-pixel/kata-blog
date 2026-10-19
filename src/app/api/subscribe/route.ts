import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { generateToken, hashToken } from "@/lib/tokens";
import { getResend, FROM, REPLY_TO, isEmailConfigured } from "@/lib/email";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit } from "@/lib/ratelimit";
import { ConfirmOptInEmail, confirmOptInText } from "@/emails/confirm-opt-in";
import { REGALO } from "@/config/regalo";
import { ASUNTOS } from "@/config/asuntos";
import { siteConfig } from "@/config/site";
import { recordSubmission } from "@/lib/lead-magnets";
import { sendResourceDelivery } from "@/lib/welcome-sequence";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email().max(254),
  source: z.string().max(80).optional(),
  resource: z.string().max(80).optional(),
  utmSource: z.string().max(80).optional(),
  turnstileToken: z.string().optional(),
  /** Literal route the signup happened on, e.g. "/blog/que-es-rag". */
  signupPath: z
    .string()
    .max(120)
    .regex(/^\/[\w\-/]*$/)
    .optional(),
  /** The separate, non-prechecked consent box (RGPD art. 6.1.a, Planet49). */
  consent: z.literal(true).optional(),
  /** Lead magnet this capture belongs to, when a widget produced something. */
  magnetSlug: z.string().max(80).optional(),
  /**
   * Whatever the widget wants remembered. Deliberately `unknown`: it is parsed
   * and *recomputed* per magnet in `recordSubmission`, never written as sent.
   */
  payload: z.unknown().optional(),
});

const ok = () => NextResponse.json({ ok: true });

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!rateLimit(`subscribe:${ip}`)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json({ ok: false, error: "captcha" }, { status: 400 });
  }

  // The checkbox has always been `required` in the markup, but the value never
  // reached the server, so a hand-rolled POST could subscribe an address with no
  // consent recorded anywhere. Double opt-in is our proof of lawful basis; it
  // should not rest on client-side validation alone.
  if (body.consent !== true) {
    return NextResponse.json({ ok: false, error: "consent" }, { status: 400 });
  }

  // Scaffolding mode (no Supabase/Resend yet): report preview so the UI flow works.
  if (!isSupabaseConfigured() || !isEmailConfigured()) {
    return NextResponse.json({ ok: true, preview: true });
  }

  const supabase = createAdminClient();
  const magnet = body.resource ?? body.magnetSlug;
  const baseSource = magnet ? `lead_magnet:${magnet}` : body.source ?? "site";
  const source = body.utmSource
    ? `${baseSource}:${body.utmSource}`
    : baseSource;

  // Recorded before touching `subscribers` so a fast confirm always finds it:
  // the welcome email looks this up by email to quote the reader's own numbers.
  // Best-effort, like the onboarding sequence — a capture must never be the
  // reason a subscription fails.
  if (body.magnetSlug) {
    await recordSubmission(supabase, {
      email: body.email,
      magnetSlug: body.magnetSlug,
      payload: body.payload,
      sourcePath: body.signupPath,
    });
  }

  const { data: existing } = await supabase
    .from("subscribers")
    .select("id, status, unsubscribe_token")
    .eq("email", body.email)
    .maybeSingle();

  // Already confirmed → don't resend the opt-in; respond generically
  // (anti-enumeration). But don't go quiet either.
  //
  // This used to be a bare `return ok()`, with a comment pointing at
  // /api/confirm as the delivery path. That path is never reached for someone
  // already confirmed, so a reader who subscribed in July and asked for a
  // resource in August was told "Confirma en tu correo y te llega" and then
  // received nothing, ever. `sendResourceDelivery` is that missing path; the
  // response shape does not change, so nothing leaks.
  //
  // From a plain form (no resource, no widget), what goes is the signup gift
  // (src/config/regalo.ts). Before 2026-10-16 that was silence too: Kata,
  // subscribed since August, signed up again from the home and got nothing,
  // and the list from before the gift had no way to receive it.
  if (existing?.status === "confirmed") {
    await sendResourceDelivery(supabase, {
      id: existing.id as string,
      email: body.email,
      unsubscribeToken: (existing.unsubscribe_token as string | null) ?? null,
      resource: magnet ? body.resource : REGALO.hoja.slug,
    });
    return ok();
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const row = {
    email: body.email,
    status: "pending",
    confirm_token_hash: hashToken(token),
    confirm_expires_at: expiresAt,
    consent_ip: ip === "unknown" ? null : ip,
    source,
    locale: siteConfig.locale,
  };

  // `signup_path` arrives with migration 0005, which is applied by hand. Deploys
  // and migrations are not atomic here, so between the two an upsert naming that
  // column errors — and since the result was never checked, we would happily
  // send a confirmation email carrying a token that was never stored. The reader
  // clicks it and gets "enlace no válido", for a subscription that never
  // existed. Retry without the column rather than lose the signup.
  let { error } = await supabase
    .from("subscribers")
    .upsert({ ...row, signup_path: body.signupPath ?? null }, { onConflict: "email" });

  if (error) {
    ({ error } = await supabase
      .from("subscribers")
      .upsert(row, { onConflict: "email" }));
  }

  if (error) {
    console.error("[subscribe] upsert failed:", error);
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 502 });
  }

  const confirmUrl =
    `${siteConfig.url}/api/confirm?token=${token}` +
    (body.resource ? `&resource=${encodeURIComponent(body.resource)}` : "");

  try {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: body.email,
      // FROM is a send-only subdomain: without this, a reply to the very first
      // email anyone gets from the site goes nowhere. Only the welcome sequence
      // set it, so the two emails that arrive before it were silent dead ends.
      replyTo: REPLY_TO,
      subject: ASUNTOS.confirmacion,
      react: ConfirmOptInEmail({ confirmUrl, brand: siteConfig.name }),
      // The one email in the system that was still HTML-only. That is a
      // bulk-mail signal — this message was landing in spam — and a client that
      // blocks HTML saw a blank page with no way to complete the opt-in. Every
      // other send here has carried a text part since 0d03ffe; this one was
      // missed, and it is the message the whole funnel rests on.
      text: confirmOptInText(confirmUrl, siteConfig.name),
    });
    if (error) {
      console.error("[subscribe] resend error:", error);
      return NextResponse.json({ ok: false, error: "email_failed" }, { status: 502 });
    }
  } catch (err) {
    console.error("[subscribe] resend threw:", err);
    return NextResponse.json({ ok: false, error: "email_failed" }, { status: 502 });
  }

  return ok();
}
