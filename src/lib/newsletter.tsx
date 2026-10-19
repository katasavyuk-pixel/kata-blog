import { newsletters } from "#site/content";
import { EdicionEmail } from "@/emails/edicion";
import { getResend, FROM, REPLY_TO, isEmailConfigured } from "@/lib/email";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { enlaceDeCorreo } from "@/lib/correo";
import { textoDeEdicion, textosDeEdicion } from "@/lib/edicion";
import { siteConfig } from "@/config/site";
import { collectCursorPages } from "@/lib/cursor-pages";
import { NewsletterError } from "@/lib/newsletter-error";
import { aceptadosDelLote } from "@/lib/resend-lote";
import { pendientes } from "@/lib/semanal";

export { NewsletterError } from "@/lib/newsletter-error";

/** Resend caps a batch at 100 messages. */
const BATCH_SIZE = 100;
/** Resend allows 5 requests/second; 250ms between batches stays under it. */
const BATCH_INTERVAL_MS = 250;
/** Stay below Supabase's default REST row cap and page by the primary key. */
const RECIPIENT_PAGE_SIZE = 500;

export type NewsletterIssue = (typeof newsletters)[number];

export type SendResult = {
  issue: string;
  recipients: number;
  sent: number;
  failed: number;
  dryRun: boolean;
};

/** Issues are opt-in to sending: `draft` defaults to true in the schema. */
export function getSendableIssue(issueId: string): NewsletterIssue {
  const issue = newsletters.find((n) => n.issue === issueId);
  if (!issue) throw new NewsletterError(`Issue "${issueId}" no existe`, 404);
  if (issue.draft) {
    throw new NewsletterError(
      `Issue "${issueId}" sigue en draft. Quita \`draft: true\` cuando esté lista.`,
      409,
    );
  }
  if (issue.sent) {
    throw new NewsletterError(`Issue "${issueId}" ya figura como enviada`, 409);
  }
  // A weekly draft leaves `{{blocks}}` where only the editor can write. Taking
  // `draft: true` off without filling them would mail the instructions.
  const sinEscribir = pendientes(issue.subject, issue.preheader, issue.title, issue.html, ...textosDeEdicion(issue));
  if (sinEscribir.length > 0) {
    throw new NewsletterError(
      `Issue "${issueId}" tiene ${sinEscribir.length} bloque(s) {{…}} sin escribir. El primero: ${sinEscribir[0].slice(0, 60)}`,
      409,
    );
  }
  return issue;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One subscriber's copy of an edition: the visual template, its plain text and the one-click unsubscribe. */
function mensajeDeEdicion(issue: NewsletterIssue, to: string, unsubscribeUrl: string, replyTo: string, asunto = issue.subject) {
  return {
    from: FROM,
    to,
    replyTo,
    subject: asunto,
    react: EdicionEmail({
      edicion: issue,
      brand: siteConfig.name,
      preview: issue.preheader,
      siteUrl: siteConfig.url,
      unsubscribeUrl,
    }),
    // See the note in welcome-sequence: HTML-only reads as bulk mail, and a
    // broadcast is the message that can least afford the Promotions tab.
    text: [
      textoDeEdicion(issue, (url) => enlaceDeCorreo(url, siteConfig.url, issue.issue)),
      `Cancelar suscripción: ${unsubscribeUrl}`,
    ].join("\n"),
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/**
 * One copy of an edition to the editor's own inbox (`RESEND_REPLY_TO`), with
 * «[PRUEBA]» in the subject: how it looks in a real mail client before anybody
 * else gets it. Any edition, drafts included, and nothing is written: no claim,
 * no list, no `sent`. Its unsubscribe link goes to the archive, not to a token.
 */
export async function sendTestIssue(issueId: string): Promise<{ issue: string; to: string }> {
  const issue = newsletters.find((n) => n.issue === issueId);
  if (!issue) throw new NewsletterError(`Issue "${issueId}" no existe`, 404);
  if (!isEmailConfigured()) throw new NewsletterError("Resend no está configurado", 503);
  if (!REPLY_TO) throw new NewsletterError("RESEND_REPLY_TO no está configurado", 503);

  const { error } = await getResend().emails.send(
    mensajeDeEdicion(issue, REPLY_TO, `${siteConfig.url}/newsletter`, REPLY_TO, `[PRUEBA] ${issue.subject}`),
  );
  if (error) throw new NewsletterError(`Resend no aceptó la prueba (${error.statusCode ?? "sin código"})`, 502);
  return { issue: issue.issue, to: REPLY_TO };
}

/**
 * Send one issue to every confirmed subscriber.
 *
 * Why a loop of our own instead of a Resend audience: the list — the PII — stays
 * in our EU Postgres, and Resend only ever sees the addresses it is delivering
 * to right now. That is the whole reason the subscriber table exists here.
 *
 * Idempotency is layered, because mailing a list twice cannot be undone:
 *  1. `newsletter_issues.issue_id` is a primary key, and it is inserted BEFORE
 *     the first send. A second run loses the insert race and aborts.
 *  2. Every batch carries a Resend `idempotencyKey`, protecting the provider
 *     request from duplicate acceptance. A partial issue stays blocked from a
 *     new application-level attempt until per-recipient recovery is available.
 */
export async function sendIssue(
  issueId: string,
  {
    dryRun = false,
    expectedRecipients,
  }: { dryRun?: boolean; expectedRecipients?: number } = {},
): Promise<SendResult> {
  const issue = getSendableIssue(issueId);

  if (!isSupabaseConfigured()) {
    throw new NewsletterError("Supabase no está configurado", 503);
  }
  if (!isEmailConfigured()) {
    throw new NewsletterError("Resend no está configurado", 503);
  }
  if (!REPLY_TO) {
    throw new NewsletterError("RESEND_REPLY_TO no está configurado", 503);
  }
  const replyTo = REPLY_TO;
  if (!dryRun && expectedRecipients === undefined) {
    throw new NewsletterError(
      "Ejecuta el ensayo en seco y confirma su recuento antes de enviar",
      400,
    );
  }

  const supabase = createAdminClient();
  const { data: priorClaim, error: claimReadError } = await supabase
    .from("newsletter_issues")
    .select("issue_id")
    .eq("issue_id", issue.issue)
    .maybeSingle();
  if (claimReadError) {
    throw new NewsletterError("No se pudo comprobar el estado de esta edición", 503);
  }
  if (priorClaim) {
    throw new NewsletterError(`Issue "${issue.issue}" ya tiene un intento registrado`, 409);
  }

  const asOf = new Date().toISOString();
  const recipientRows = await collectCursorPages(RECIPIENT_PAGE_SIZE, async (afterId) => {
    let query = supabase
      .from("subscribers")
      .select("id, email, unsubscribe_token")
      .eq("status", "confirmed")
      .lte("confirmed_at", asOf)
      .not("unsubscribe_token", "is", null)
      .order("id", { ascending: true })
      .limit(RECIPIENT_PAGE_SIZE);
    if (afterId) query = query.gt("id", afterId);

    const { data, error } = await query;
    if (error) {
      throw new NewsletterError(`No se pudo leer la lista: ${error.message}`, 500);
    }
    return (data ?? []) as {
      id: string;
      email: string | null;
      unsubscribe_token: string | null;
    }[];
  });

  const list = recipientRows.filter(
    (r): r is typeof r & { email: string; unsubscribe_token: string } =>
      typeof r.email === "string" && typeof r.unsubscribe_token === "string",
  );

  if (dryRun) {
    return { issue: issueId, recipients: list.length, sent: 0, failed: 0, dryRun: true };
  }

  if (list.length === 0) {
    throw new NewsletterError("No hay suscriptores confirmados", 409);
  }
  if (expectedRecipients !== list.length) {
    throw new NewsletterError(
      `El recuento cambió desde el ensayo (${expectedRecipients} → ${list.length}). Repite el ensayo antes de enviar.`,
      409,
    );
  }

  // Claim the issue first. If this fails on the primary key, it has already
  // gone out and we must not send it again.
  const { error: claimError } = await supabase.from("newsletter_issues").insert({
    issue_id: issue.issue,
    subject: issue.subject,
    recipient_count: list.length,
  });
  if (claimError) {
    throw new NewsletterError(
      `La edición "${issue.issue}" ya se envió (o no se pudo registrar): ${claimError.message}`,
      409,
    );
  }

  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const chunk = list.slice(i, i + BATCH_SIZE);
    const payload = chunk.map((r) =>
      mensajeDeEdicion(
        issue,
        r.email,
        `${siteConfig.url}/api/unsubscribe?token=${encodeURIComponent(r.unsubscribe_token)}`,
        replyTo,
      ),
    );

    try {
      const respuesta = await resend.batch.send(payload, {
        idempotencyKey: `${issue.issue}:${i / BATCH_SIZE}`,
        batchValidation: "strict",
      });
      const { error } = respuesta;
      const accepted = aceptadosDelLote(respuesta, chunk.length);
      sent += accepted;
      if (error || accepted !== chunk.length) {
        failed = list.length - sent;
        console.error(
          `[newsletter] batch ${i / BATCH_SIZE} incompleto (${error?.statusCode ?? "respuesta incompleta"})`,
        );
        break;
      }
    } catch {
      failed = list.length - sent;
      console.error(`[newsletter] batch ${i / BATCH_SIZE} lanzó un error de transporte`);
      break;
    }

    if (i + BATCH_SIZE < list.length) await sleep(BATCH_INTERVAL_MS);
  }

  if (failed > 0) {
    await supabase
      .from("newsletter_issues")
      .update({ failed_count: failed })
      .eq("issue_id", issue.issue);
  }

  return { issue: issue.issue, recipients: list.length, sent, failed, dryRun: false };
}
