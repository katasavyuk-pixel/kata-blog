"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type IssueOption = {
  issue: string;
  subject: string;
  title: string;
  date: string;
};

type SendResult = {
  ok: boolean;
  issue?: string;
  recipients?: number;
  sent?: number;
  failed?: number;
  dryRun?: boolean;
  error?: string;
};

type Phase = "idle" | "checking" | "ready" | "sending" | "sent" | "partial" | "error";

const messages: Record<string, string> = {
  ensayo_requerido: "Haz primero un ensayo en seco y revisa el recuento.",
  no_autorizado: "La sesión del panel ha caducado. Vuelve a entrar.",
  origen_no_autorizado: "La petición no procede de este sitio.",
  panel_no_configurado: "El panel no está configurado.",
  error_interno: "No se pudo completar la operación. Revisa los registros del servidor.",
};

export function NewsletterSendPanel({ issues }: { issues: IssueOption[] }) {
  const [issueId, setIssueId] = useState(issues[0]?.issue ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const selected = issues.find((issue) => issue.issue === issueId);
  const busy = phase === "checking" || phase === "sending";

  function resetForIssue(nextIssue: string) {
    setIssueId(nextIssue);
    setPhase("idle");
    setRecipientCount(null);
    setConfirmed(false);
    setResult(null);
  }

  async function requestSend(dryRun: boolean) {
    if (!issueId || busy) return;
    setPhase(dryRun ? "checking" : "sending");
    setResult(null);

    try {
      const response = await fetch("/panel/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue: issueId,
          dryRun,
          ...(dryRun ? {} : { expectedRecipients: recipientCount }),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as SendResult;
      setResult(data);

      if (dryRun && response.ok && data.ok && data.dryRun && typeof data.recipients === "number") {
        setRecipientCount(data.recipients);
        setConfirmed(false);
        setPhase("ready");
        return;
      }

      if (!dryRun && response.ok && data.ok && data.failed === 0) {
        setPhase("sent");
        return;
      }

      if (!dryRun && data.dryRun === false && typeof data.sent === "number") {
        setPhase("partial");
        return;
      }

      setRecipientCount(null);
      setConfirmed(false);
      setPhase("error");
    } catch {
      setRecipientCount(null);
      setConfirmed(false);
      setPhase("error");
      setResult({ ok: false, error: "conexión" });
    }
  }

  if (issues.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted">
        No hay ediciones aprobadas pendientes de envío.
      </p>
    );
  }

  return (
    <div className="mt-4 max-w-2xl space-y-4 rounded-sm border border-border bg-surface p-5">
      <div>
        <label htmlFor="newsletter-issue" className="block text-sm font-medium text-fg">
          Edición aprobada
        </label>
        <select
          id="newsletter-issue"
          value={issueId}
          onChange={(event) => resetForIssue(event.target.value)}
          disabled={busy || phase === "sent"}
          className="mt-2 h-11 w-full border border-border bg-bg px-3 text-sm text-fg"
        >
          {issues.map((issue) => (
            <option key={issue.issue} value={issue.issue}>
              {issue.date} · {issue.title} ({issue.issue})
            </option>
          ))}
        </select>
        {selected ? <p className="mt-2 text-sm text-muted">Asunto: {selected.subject}</p> : null}
      </div>

      {phase !== "ready" && phase !== "sent" && phase !== "partial" ? (
        <Button type="button" variant="secondary" onClick={() => void requestSend(true)} disabled={busy}>
          {phase === "checking" ? "Contando destinatarios…" : "Hacer ensayo en seco"}
        </Button>
      ) : null}

      {phase === "ready" && recipientCount !== null ? (
        <div className="space-y-3 border-t border-border pt-4">
          <p role="status" className="text-sm text-fg">
            Ensayo completado: <strong>{recipientCount}</strong> suscriptores confirmados recibirían esta edición. No se ha enviado nada.
          </p>
          {recipientCount > 0 ? (
            <>
              <label className="flex items-start gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1 accent-[var(--color-accent)]"
                />
                <span>He revisado el recuento y confirmo el envío a {recipientCount} suscriptores.</span>
              </label>
              <Button
                type="button"
                onClick={() => void requestSend(false)}
                disabled={!confirmed || busy}
              >
                Enviar a {recipientCount} suscriptores
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted">No hay destinatarios. No se puede enviar una edición vacía.</p>
          )}
        </div>
      ) : null}

      {phase === "sending" ? (
        <p role="status" className="text-sm text-muted">Enviando la edición…</p>
      ) : null}

      {phase === "sent" ? (
        <div role="status" className="space-y-2 border-t border-border pt-4 text-sm text-fg">
          <p>Envío completado: {result?.sent ?? 0} correos enviados, sin fallos.</p>
          <p className="text-muted">
            Para mostrarla en el archivo público, integra la edición con <code>sent: true</code> y despliega el cambio.
          </p>
        </div>
      ) : null}

      {phase === "partial" ? (
        <div role="alert" className="space-y-2 border-t border-border pt-4 text-sm text-danger">
          <p>
            Envío incompleto: {result?.sent ?? 0} enviados y {result?.failed ?? 0} fallidos de {result?.recipients ?? 0}.
          </p>
          <p>No repitas el envío: la edición queda bloqueada para impedir duplicados. Requiere recuperación técnica.</p>
        </div>
      ) : null}

      {phase === "error" ? (
        <div role="alert" className="border-t border-border pt-4 text-sm text-danger">
          {messages[result?.error ?? ""] ?? result?.error ?? "No se pudo completar el ensayo."}
          {result?.error === "El recuento cambió desde el ensayo" ? " Repite el ensayo." : null}
        </div>
      ) : null}
    </div>
  );
}
