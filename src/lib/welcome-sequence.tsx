import { sequenceEmails } from "#site/content";
import { NewsletterEmail } from "@/emails/newsletter";
import { getResend, FROM, REPLY_TO, isEmailConfigured } from "@/lib/email";
import type { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/config/site";
import { estilarHtml } from "@/lib/correo";
import { renderTemplate, htmlToText, TemplateError } from "@/lib/email-template";
import { openingBlock, bloquesDeDescarga, regaloBlock, resourceDeliveryBody } from "@/lib/email-blocks";
import { REGALO } from "@/config/regalo";
import { ASUNTOS } from "@/config/asuntos";
import { getLatestSubmission, type MagnetSubmission } from "@/lib/lead-magnets";
import { signedDownloadUrl } from "@/lib/signed-links";
import { generateToken } from "@/lib/tokens";

type AdminClient = ReturnType<typeof createAdminClient>;

export type SequenceStep = (typeof sequenceEmails)[number];

/**
 * The onboarding sequence, read from content/emails/*.md at build time.
 *
 * Ordering is explicit (`order`) rather than filename-derived so renumbering a
 * step does not mean renaming files and losing the `key` that ties a sent email
 * to its row in `scheduled_emails`.
 */
export function getSequence(name = "bienvenida"): SequenceStep[] {
  return sequenceEmails
    .filter((step) => step.sequence === name && !step.draft)
    .sort((a, b) => a.order - b.order);
}

export type RenderContext = {
  siteUrl: string;
  submission: MagnetSubmission | null;
  downloadUrl: string | null;
  downloadLabel: string;
  /** The resource the reader asked for, if any: the one `downloadUrl` serves. */
  downloadSlug?: string;
  /** The signup gift's sheet, signed for this reader; null until it is published. */
  regaloUrl: string | null;
};

/**
 * Fill in a step's placeholders. Returns null when the copy references a
 * placeholder that does not exist — better one missing email than a visible
 * `{{typo}}` delivered to the whole list.
 */
export function renderStep(step: SequenceStep, ctx: RenderContext): string | null {
  try {
    return renderTemplate(step.html, {
      url_sitio: ctx.siteUrl,
      nombre_sitio: siteConfig.name,
      apertura_personalizada: openingBlock(ctx.siteUrl, ctx.submission),
      ...bloquesDeDescarga(ctx),
    });
  } catch (err) {
    if (err instanceof TemplateError) {
      console.error(`[welcome-sequence] ${step.key}: ${err.message}`);
      return null;
    }
    throw err;
  }
}

/**
 * Everything the copy might want to say back to this subscriber.
 *
 * Looked up once and reused for every step, so a three-email sequence costs one
 * read rather than three.
 */
export async function buildContext(
  supabase: AdminClient,
  email: string,
  resource?: string,
): Promise<RenderContext> {
  const submission = await getLatestSubmission(supabase, email);

  let downloadUrl: string | null = null;
  let downloadLabel = "Descargar el recurso";

  // Only offer a download if the resource really is published: a button
  // pointing at nothing is worse than no button, and it would arrive in the
  // one email the reader is most likely to open.
  const publicado = async (slug: string) => {
    const { data } = await supabase
      .from("resources")
      .select("title")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    return data ? ((data.title as string) || null) : undefined;
  };
  const enlace = (slug: string) =>
    signedDownloadUrl(siteConfig.url, slug, email) ??
    `${siteConfig.url}/api/download?slug=${encodeURIComponent(slug)}`;

  if (resource) {
    const titulo = await publicado(resource);
    if (titulo !== undefined) {
      downloadLabel = titulo ?? downloadLabel;
      downloadUrl = enlace(resource);
    }
  }
  // The gift goes to everyone (renderStep keeps it from showing twice).
  const regaloUrl = (await publicado(REGALO.hoja.slug)) !== undefined ? enlace(REGALO.hoja.slug) : null;

  return { siteUrl: siteConfig.url, submission, downloadUrl, downloadLabel, downloadSlug: resource, regaloUrl };
}

function unsubscribeUrlFor(token: string): string {
  return `${siteConfig.url}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

function messageFor(
  step: SequenceStep,
  html: string,
  to: string,
  unsubscribeUrl: string,
) {
  return {
    from: FROM,
    to,
    replyTo: REPLY_TO,
    subject: step.subject,
    react: NewsletterEmail({
      brand: siteConfig.name,
      preview: step.preheader,
      title: step.title,
      unsubscribeUrl,
      children: <div dangerouslySetInnerHTML={{ __html: estilarHtml(html) }} />,
    }),
    // Plain-text alternative. An HTML-only email is a bulk-mail signal — the
    // sequence was landing in Gmail's Promotions tab — and clients that block
    // HTML show nothing at all without it.
    text: [
      step.title,
      "",
      htmlToText(html),
      `Cancelar suscripción: ${unsubscribeUrl}`,
    ].join("\n"),
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/**
 * Hand a resource to somebody who confirmed their address a long time ago.
 *
 * /api/subscribe short-circuits on an already-confirmed address so it does not
 * resend an opt-in — correct, and anti-enumeration depends on the response
 * staying generic. But the short-circuit was the end of the road: a reader who
 * subscribed in July, watched the GEO episode in August and asked for the
 * prompt got a form that said "Confirma en tu correo y te llega" and then
 * nothing at all, forever. The comment there pointed at /api/confirm as the
 * delivery path; /api/confirm is never reached for that reader, and
 * `scheduleWelcomeSequence` would refuse anyway because their rows already
 * exist in `scheduled_emails`.
 *
 * So this is the missing path, and it is deliberately small: the block they
 * asked for, a shell, and an honest unsubscribe header. No sequence, no
 * re-enrolment, nothing that treats a long-standing subscriber as new.
 *
 * Best-effort like everything else on this route — a delivery must never be the
 * reason a request fails, and the HTTP response never changes shape.
 */
export async function sendResourceDelivery(
  supabase: AdminClient,
  sub: {
    id: string;
    email: string;
    unsubscribeToken: string | null;
    resource?: string;
  },
): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    const ctx = await buildContext(supabase, sub.email, sub.resource);

    // Only what they just asked for. Returns null when that is nothing, and
    // then we stay silent — see the comment on resourceDeliveryBody for the
    // shape of the bug this replaced.
    // The signup gift goes in its own block, with the profile for the AI too.
    const regaloUrl = sub.resource === REGALO.hoja.slug ? ctx.regaloUrl : null;
    const html = regaloUrl
      ? regaloBlock(regaloUrl, ctx.siteUrl)
      : resourceDeliveryBody({
          downloadUrl: ctx.downloadUrl,
          downloadLabel: ctx.downloadLabel,
          submission: ctx.submission,
        });
    if (!html) return;

    // The List-Unsubscribe header has to name a token that exists. Rows from
    // before this column was populated have none; mint one rather than send a
    // header that updates zero rows.
    let token = sub.unsubscribeToken;
    if (!token) {
      token = generateToken();
      const { error } = await supabase
        .from("subscribers")
        .update({ unsubscribe_token: token })
        .eq("id", sub.id);
      if (error) return;
    }

    const unsubscribeUrl = unsubscribeUrlFor(token);
    const title = "Aquí tienes lo que pediste";

    await getResend().emails.send({
      from: FROM,
      to: sub.email,
      replyTo: REPLY_TO,
      subject: regaloUrl ? ASUNTOS.regalo : ASUNTOS.recurso,
      react: NewsletterEmail({
        brand: siteConfig.name,
        preview: "Lo que pediste, sin volver a darte de alta.",
        title,
        unsubscribeUrl,
        children: <div dangerouslySetInnerHTML={{ __html: estilarHtml(html) }} />,
      }),
      text: [title, "", htmlToText(html), `Cancelar suscripción: ${unsubscribeUrl}`].join(
        "\n",
      ),
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (err) {
    console.error("[resource-delivery] send failed:", err);
  }
}

/**
 * Schedule the onboarding emails in Resend (`scheduledAt`, no cron needed) and
 * record their ids in `scheduled_emails` so an unsubscribe can cancel them.
 *
 * The step with `delayHours: 0` is sent immediately. It replaces the separate
 * "welcome" email that used to go out here, which shipped without a
 * List-Unsubscribe header or a visible unsubscribe link — going through the
 * shared shell fixes that as a side effect of moving the copy into a file.
 *
 * Best-effort by design: the double opt-in flow must never fail because of the
 * sequence, and while `scheduled_emails` does not exist the whole thing is
 * silently skipped.
 */
export async function scheduleWelcomeSequence(
  supabase: AdminClient,
  sub: {
    id: string;
    email: string;
    unsubscribeToken: string;
    resource?: string;
  },
): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    const { data: existing, error } = await supabase
      .from("scheduled_emails")
      .select("email_key")
      .eq("subscriber_id", sub.id)
      .limit(1);
    if (error) return; // table missing or transient failure → skip, don't break confirm

    // Any row at all means this subscriber already went through the sequence.
    //
    // This used to compare key by key. That was safe only while the keys never
    // changed: renaming d2-curso → w2-historia would have made every existing
    // subscriber look un-enrolled and sent them the whole sequence a second
    // time. Consent cycles are per subscriber, not per step, so this is the
    // condition that actually matches the intent.
    if (existing && existing.length > 0) return;

    const steps = getSequence();
    if (steps.length === 0) return;

    const ctx = await buildContext(supabase, sub.email, sub.resource);
    const unsubscribeUrl = unsubscribeUrlFor(sub.unsubscribeToken);
    const resend = getResend();

    for (const step of steps) {
      const html = renderStep(step, ctx);
      if (html === null) continue;

      const immediate = step.delayHours === 0;
      const scheduledAt = new Date(
        Date.now() + step.delayHours * 60 * 60 * 1000,
      ).toISOString();

      const { data: sent, error: sendError } = await resend.emails.send({
        ...messageFor(step, html, sub.email, unsubscribeUrl),
        ...(immediate ? {} : { scheduledAt }),
      });
      if (sendError || !sent) continue;

      await supabase.from("scheduled_emails").insert({
        subscriber_id: sub.id,
        email_key: step.key,
        resend_email_id: sent.id,
        scheduled_at: scheduledAt,
      });
    }
  } catch {
    // Never let onboarding emails break the opt-in redirect.
  }
}

/**
 * Cancel any still-pending sequence emails for a subscriber and drop the rows.
 * Deleting (not marking) means a future re-subscription is a fresh consent
 * cycle and gets the sequence again.
 */
export async function cancelWelcomeSequence(
  supabase: AdminClient,
  subscriberId: string,
): Promise<void> {
  try {
    const { data: rows, error } = await supabase
      .from("scheduled_emails")
      .select("resend_email_id, scheduled_at")
      .eq("subscriber_id", subscriberId);
    if (error || !rows?.length) return;

    if (isEmailConfigured()) {
      const resend = getResend();
      const pending = rows.filter(
        (r) =>
          r.resend_email_id &&
          new Date(r.scheduled_at).getTime() > Date.now(),
      );
      for (const r of pending) {
        try {
          await resend.emails.cancel(r.resend_email_id);
        } catch {
          // Already sent or already cancelled — nothing to do.
        }
      }
    }

    await supabase
      .from("scheduled_emails")
      .delete()
      .eq("subscriber_id", subscriberId);
  } catch {
    // Best-effort: never block the one-click unsubscribe response.
  }
}

/**
 * Send the whole sequence at once to one address, for review.
 *
 * Writes nothing: no subscriber, no scheduled_emails rows, no Resend schedule.
 * The unsubscribe token is deliberately fake — /api/unsubscribe updates zero
 * rows for an unknown token, so the footer link is inert rather than dangerous.
 *
 * Uses the same render path as production. A preview that renders differently
 * from the real thing is worse than no preview.
 */
export async function sendSequencePreview(
  supabase: AdminClient,
  input: { email: string; resource?: string; dryRun?: boolean },
): Promise<{
  steps: { key: string; subject: string; html?: string; sent?: boolean; error?: string }[];
  aviso?: string;
}> {
  const steps = getSequence();
  const ctx = await buildContext(supabase, input.email, input.resource);
  const unsubscribeUrl = unsubscribeUrlFor("preview-token-no-valido");
  const results = [];

  for (const step of steps) {
    const html = renderStep(step, ctx);
    if (html === null) {
      results.push({
        key: step.key,
        subject: step.subject,
        error: "placeholder sin resolver — mira los logs del servidor",
      });
      continue;
    }
    if (input.dryRun) {
      results.push({ key: step.key, subject: step.subject, html });
      continue;
    }
    const { error } = await getResend().emails.send(
      messageFor(
        { ...step, subject: `[PRUEBA] ${step.subject}` },
        html,
        input.email,
        unsubscribeUrl,
      ),
    );
    results.push({
      key: step.key,
      subject: step.subject,
      sent: !error,
      ...(error ? { error: error.message } : {}),
    });
  }

  // The download button needs a CONFIRMED subscriber: the signature identifies
  // the address, but /api/download still reads its status live. A preview sent to
  // an address that is not confirmed therefore contains a button that bounces to
  // /recursos — correct behaviour that looks exactly like a bug. Say so, because
  // this is the one thing about the preview that is not representative.
  let aviso: string | undefined;
  if (ctx.downloadUrl) {
    const { data } = await supabase
      .from("subscribers")
      .select("status")
      .eq("email", input.email)
      .maybeSingle();
    if (data?.status !== "confirmed") {
      aviso =
        `${input.email} no es un suscriptor confirmado, así que el botón de descarga ` +
        `rebotará a /recursos en vez de servir el PDF. Es el comportamiento correcto: ` +
        `la descarga exige email confirmado. Para probar la descarga de verdad hace ` +
        `falta un alta real y pulsar el enlace de confirmación.`;
    }
  }

  return { steps: results, aviso };
}
