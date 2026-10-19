import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { isEmailConfigured } from "@/lib/email";
import { hashToken, safeEqualHex } from "@/lib/tokens";
import { sendSequencePreview } from "@/lib/welcome-sequence";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email().max(254),
  /** Slug of a published resource, to preview the download block. */
  resource: z.string().max(80).optional(),
  /** Return the rendered HTML instead of sending anything. */
  dryRun: z.boolean().optional(),
});

/**
 * Send the whole onboarding sequence to one address, right now.
 *
 * Exists because the alternative way to review a change to these emails is to
 * subscribe and wait four days. Writes nothing: no subscriber row, no
 * scheduled_emails rows, nothing scheduled in Resend.
 *
 *   curl -X POST https://kata.ianexora.com/api/welcome-sequence/test \
 *     -H "Authorization: Bearer $NEWSLETTER_SEND_SECRET" \
 *     -H 'Content-Type: application/json' \
 *     -d '{"email":"tu@correo.com","resource":"25-datos-emails-logisticos","dryRun":true}'
 *
 * With dryRun it returns the HTML of each step, which is also how you catch a
 * mistyped placeholder before it reaches anyone.
 *
 * Reuses NEWSLETTER_SEND_SECRET rather than adding an env: both are "let Kata
 * trigger a send from a terminal", and a second secret to keep in sync is a
 * second secret to leak.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NEWSLETTER_SEND_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "NEWSLETTER_SEND_SECRET no configurado" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  // Hashing both sides first means the compared buffers are always the same
  // length, so the comparison leaks neither the value nor its length.
  if (!safeEqualHex(hashToken(auth), hashToken(`Bearer ${secret}`))) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase no está configurado" },
      { status: 503 },
    );
  }
  if (!isEmailConfigured() && !body.dryRun) {
    return NextResponse.json(
      { ok: false, error: "Resend no está configurado (usa dryRun)" },
      { status: 503 },
    );
  }

  try {
    const { steps, aviso } = await sendSequencePreview(createAdminClient(), {
      email: body.email,
      resource: body.resource,
      dryRun: body.dryRun ?? false,
    });
    return NextResponse.json({
      ok: true,
      dryRun: body.dryRun ?? false,
      steps,
      ...(aviso ? { aviso } : {}),
    });
  } catch (err) {
    console.error("[welcome-sequence/test] error:", err);
    return NextResponse.json({ ok: false, error: "error interno" }, { status: 500 });
  }
}
