import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { NewsletterError, sendIssue, sendTestIssue } from "@/lib/newsletter";

export const runtime = "nodejs";

const BodySchema = z.object({
  issue: z.string().min(1).max(60),
  dryRun: z.boolean().optional(),
  prueba: z.boolean().optional(),
  expectedRecipients: z.number().int().min(0).max(100_000).optional(),
});

/**
 * Broadcast one newsletter issue to the confirmed list.
 *
 * Triggered by hand, on purpose: the newsletter is fortnightly and every issue
 * gets read before it goes out, so a cron would only add a way to send
 * something nobody reviewed.
 *
 *   curl -X POST https://kata.ianexora.com/api/newsletter/send \
 *     -H "Authorization: Bearer $NEWSLETTER_SEND_SECRET" \
 *     -H 'Content-Type: application/json' \
 *     -d '{"issue":"2026-08-antes-del-tms","dryRun":true}'
 *
 * After reviewing `recipients`, send with `dryRun:false` and that same value
 * in `expectedRecipients`; a changed list is rejected before the first send.
 *
 * Always dry-run first: it reports how many people would receive it without
 * sending anything.
 *
 * `"prueba": true` sends one copy to RESEND_REPLY_TO only, subject «[PRUEBA]»,
 * drafts included, writing nothing: to see an edition in a real inbox first.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NEWSLETTER_SEND_SECRET;

  // Fails closed. An unset secret disables the endpoint rather than opening it —
  // the opposite of the Turnstile guard, because the blast radius here is the
  // whole list and it cannot be undone.
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "NEWSLETTER_SEND_SECRET no configurado" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  if (body.prueba) {
    try {
      return NextResponse.json({ ok: true, prueba: true, ...(await sendTestIssue(body.issue)) });
    } catch (err) {
      if (err instanceof NewsletterError) {
        return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
      }
      console.error("[newsletter] error inesperado en la prueba:", err);
      return NextResponse.json({ ok: false, error: "error interno" }, { status: 500 });
    }
  }

  const dryRun = body.dryRun ?? false;
  if (!dryRun && body.expectedRecipients === undefined) {
    return NextResponse.json(
      { ok: false, error: "ensayo_requerido" },
      { status: 400 },
    );
  }

  try {
    const result = await sendIssue(body.issue, {
      dryRun,
      expectedRecipients: body.expectedRecipients,
    });
    const complete = result.failed === 0;
    return NextResponse.json(
      { ok: complete, ...result },
      { status: complete ? 200 : 502 },
    );
  } catch (err) {
    if (err instanceof NewsletterError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error("[newsletter] error inesperado:", err);
    return NextResponse.json({ ok: false, error: "error interno" }, { status: 500 });
  }
}
