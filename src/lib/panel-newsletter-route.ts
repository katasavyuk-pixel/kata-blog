import { z } from "zod";
import { PANEL_COOKIE, isPanelConfigured, verifySession } from "@/lib/panel-auth";
import { NewsletterError } from "@/lib/newsletter-error";

const BodySchema = z.object({
  issue: z.string().min(1).max(60),
  dryRun: z.boolean(),
  expectedRecipients: z.number().int().min(0).max(100_000).optional(),
});

type SendIssue = (
  issueId: string,
  options: { dryRun: boolean; expectedRecipients?: number },
) => Promise<{
  issue: string;
  recipients: number;
  sent: number;
  failed: number;
  dryRun: boolean;
}>;

/** The panel's gate for both routes: configured, a valid session, and a request from this site. Null when it passes. */
function rechazoDelPanel(request: Request): Response | null {
  if (!isPanelConfigured()) {
    return Response.json({ ok: false, error: "panel_no_configurado" }, { status: 503 });
  }

  const session = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${PANEL_COOKIE}=`))
    ?.slice(PANEL_COOKIE.length + 1);
  if (!verifySession(session)) {
    return Response.json({ ok: false, error: "no_autorizado" }, { status: 401 });
  }

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ ok: false, error: "origen_no_autorizado" }, { status: 403 });
  }
  return null;
}

/** Shared request logic lets the route contract be tested without loading React email templates. */
export async function handlePanelNewsletterSend(request: Request, sendIssue: SendIssue) {
  const rechazo = rechazoDelPanel(request);
  if (rechazo) return rechazo;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  if (!body.dryRun && body.expectedRecipients === undefined) {
    return Response.json({ ok: false, error: "ensayo_requerido" }, { status: 400 });
  }

  try {
    const result = await sendIssue(body.issue, {
      dryRun: body.dryRun,
      expectedRecipients: body.expectedRecipients,
    });
    const complete = result.failed === 0;
    return Response.json(
      { ok: complete, ...result },
      { status: complete ? 200 : 502 },
    );
  } catch (err) {
    if (err instanceof NewsletterError) {
      return Response.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error("[newsletter] fallo interno desde panel:", err);
    return Response.json({ ok: false, error: "error_interno" }, { status: 500 });
  }
}

const PruebaSchema = z.object({ issue: z.string().min(1).max(60) });

type SendTestIssue = (issueId: string) => Promise<{ issue: string; to: string }>;

/**
 * One copy of an edition to the editor's own inbox, from the panel: the same
 * session and origin checks as the real send, and nothing about the list.
 */
export async function handlePanelNewsletterTest(request: Request, sendTestIssue: SendTestIssue) {
  const rechazo = rechazoDelPanel(request);
  if (rechazo) return rechazo;

  let body: z.infer<typeof PruebaSchema>;
  try {
    body = PruebaSchema.parse(await request.json());
  } catch {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  try {
    return Response.json({ ok: true, ...(await sendTestIssue(body.issue)) });
  } catch (err) {
    if (err instanceof NewsletterError) {
      return Response.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error("[newsletter] fallo interno en la prueba desde panel:", err);
    return Response.json({ ok: false, error: "error_interno" }, { status: 500 });
  }
}
