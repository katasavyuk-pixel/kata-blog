"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TurnstileWidget } from "./turnstile-widget";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type FormState = "idle" | "loading" | "done" | "preview" | "error" | "waiting";
type Tone = "light" | "dark";
type Layout = "inline" | "stacked";

/**
 * One presentation. `tone` survives as a prop because the call sites still
 * pass it; the dark/light split died with the two-surface design — every
 * surface is the same warm black now.
 */
const tones: Record<Tone, { input: string; help: string; link: string; status: string }> = {
  light: {
    input: "border-border bg-bg text-fg placeholder:text-faint focus:border-accent-ink",
    help: "text-muted",
    link: "text-accent-ink underline",
    status: "text-accent-ink",
  },
  dark: {
    input: "border-border bg-bg text-fg placeholder:text-faint focus:border-accent-ink",
    help: "text-muted",
    link: "text-accent-ink underline",
    status: "text-accent-ink",
  },
};

/**
 * Newsletter capture form (footer, home, /recursos, article body, embeddable).
 * Posts to /api/subscribe → double opt-in. `resource` turns it into a lead-magnet
 * capture (source becomes `lead_magnet:<resource>`). `tone` adapts presentation to
 * light cream or dark espresso surfaces; `layout` stacks the field + button.
 *
 * One typed field, always. Every surface that captures email goes through this
 * component rather than growing its own: the consent checkbox, the Turnstile
 * gate and the anti-enumeration contract with the route handler are things that
 * must not exist in three slightly different versions.
 *
 * `magnetSlug` + `payload` let a widget attach what the reader just produced
 * (the cost breakdown, for instance) so the first onboarding email can deliver
 * it back. `payload` is a thunk so it is read at submit time, not at render.
 */
export function SubscribeForm({
  source = "footer",
  resource,
  tone = "light",
  layout = "inline",
  magnetSlug,
  payload,
  submitLabel = "Suscribirme",
  doneMessage,
  consentLabel,
  visibleLabel,
}: {
  source?: string;
  resource?: string;
  tone?: Tone;
  layout?: Layout;
  magnetSlug?: string;
  payload?: () => Record<string, unknown>;
  submitLabel?: string;
  doneMessage?: string;
  consentLabel?: React.ReactNode;
  /** Show the field's label above it instead of only to screen readers. */
  visibleLabel?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const inputId = `newsletter-email-${source}`;
  const t = tones[tone];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const form = event.currentTarget;
    const turnstileToken =
      (form.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)
        ?.value || undefined;

    // With Turnstile configured the server rejects a tokenless request, so
    // sending one anyway would burn the signup and show a generic "algo falló".
    // The widget can still be loading — say so and let them press again, instead
    // of failing in a way that looks like the form is broken.
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setState("waiting");
      return;
    }

    try {
      const utm = new URLSearchParams(window.location.search).get("utm_source");
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source,
          resource,
          utmSource: utm ?? undefined,
          turnstileToken,
          // Which page the signup happened on — `source` is the semantic bucket
          // ("footer", "lead_magnet:x"), this is the literal route, so the funnel
          // panel can answer "which article captures".
          signupPath: window.location.pathname,
          // The checkbox is `required`, so reaching here means it was ticked.
          // Sending it lets the server refuse a signup that never showed consent
          // — until now the checkbox was purely decorative to the backend.
          consent: true,
          magnetSlug,
          payload: payload?.(),
        }),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { preview?: boolean };
      setState(data.preview ? "preview" : "done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className={cn("font-sans text-sm", t.status)} role="status">
        {doneMessage ??
          "¡Casi! Revisa tu correo y confirma la suscripción (doble opt-in)."}
      </p>
    );
  }

  if (state === "preview") {
    return (
      <p className={cn("text-sm", t.status)} role="status">
        Formulario conectado ✓ — modo previsualización. Configura Supabase y Resend
        para enviar el email de confirmación real.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} data-source={source} className="flex flex-col gap-3 font-sans">
      {visibleLabel ? (
        <label htmlFor={inputId} className="-mb-1 text-[0.875rem] font-medium text-fg">
          {visibleLabel}
        </label>
      ) : null}
      <div className={cn("flex flex-col gap-2", layout === "inline" && "sm:flex-row")}>
        {visibleLabel ? null : (
          <label htmlFor={inputId} className="sr-only">
            Correo electrónico
          </label>
        )}
        <input
          id={inputId}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          className={cn(
            "h-11 w-full rounded-sm border px-4 text-sm focus:outline-none",
            t.input,
          )}
        />
        <Button type="submit" size="md" disabled={state === "loading"}>
          {state === "loading" ? "Enviando…" : submitLabel}
        </Button>
      </div>

      {TURNSTILE_SITE_KEY ? <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} /> : null}

      <label className={cn("flex items-start gap-2 text-xs leading-relaxed", t.help)}>
        <input
          type="checkbox"
          required
          className="mt-0.5 accent-[var(--color-accent)]"
        />
        <span>
          {consentLabel ??
            (resource ? (
              // Asking for a file and asking for the newsletter are the same
              // signup — one row in `subscribers`, one list. Saying so here is
              // both the honest thing and the fix for the confusion it caused:
              // a reader who gave their address for a download then met more
              // "suscríbete" boxes and reasonably assumed they were separate.
              <>
                Acepto recibir la newsletter y la{" "}
                <a href="/privacidad" className={t.link}>
                  política de privacidad
                </a>
                . Es una sola lista: te mando el recurso y te quedas suscrito. Te
                llega un email para confirmar, y puedes darte de baja en un clic
                desde cualquiera de ellos.
              </>
            ) : (
              <>
                Acepto recibir la newsletter y la{" "}
                <a href="/privacidad" className={t.link}>
                  política de privacidad
                </a>
                . Te mando un email para confirmar tu suscripción (doble opt-in).
              </>
            ))}
        </span>
      </label>

      {state === "waiting" ? (
        <p className={cn("text-sm", t.status)} role="status">
          Un segundo: la verificación anti-spam está cargando. Vuelve a pulsar.
        </p>
      ) : null}

      {state === "error" ? (
        <p className="text-sm text-danger" role="alert">
          Algo falló. Inténtalo de nuevo en un momento.
        </p>
      ) : null}
    </form>
  );
}
