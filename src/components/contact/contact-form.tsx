"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/newsletter/turnstile-widget";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type FormState = "idle" | "loading" | "done" | "preview" | "error";

/**
 * Contact form — posts to /api/contact, a plain transactional email (no Supabase).
 * `intent` only changes the subject line so a diagnosis request is not mixed
 * with a generic "tell me your case" note.
 */
export function ContactForm({
  intent = "general",
  messagePlaceholder = "Cuéntame qué querrías implementar en tu negocio.",
  submitLabel = "Enviar",
  doneMessage = "Recibido. Te respondo en cuanto pueda.",
}: {
  intent?: "general" | "diagnostico";
  messagePlaceholder?: string;
  submitLabel?: string;
  doneMessage?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const form = event.currentTarget;
    const turnstileToken =
      (form.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)
        ?.value || undefined;
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, turnstileToken, intent }),
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
      <p className="text-sm text-accent-ink" role="status">
        {doneMessage}
      </p>
    );
  }

  if (state === "preview") {
    return (
      <p className="text-sm text-accent-ink" role="status">
        Formulario conectado ✓ — modo previsualización. Configura Resend para
        enviar el email real.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label htmlFor="contact-name" className="sr-only">
          Nombre
        </label>
        <input
          id="contact-name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tu nombre"
          className="h-11 w-full rounded-sm border border-border bg-bg px-4 text-sm text-fg placeholder:text-faint focus:border-accent-ink focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="sr-only">
          Correo electrónico
        </label>
        <input
          id="contact-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          className="h-11 w-full rounded-sm border border-border bg-bg px-4 text-sm text-fg placeholder:text-faint focus:border-accent-ink focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="sr-only">
          Cuéntame tu caso
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={messagePlaceholder}
          className="w-full rounded-sm border border-border bg-bg px-4 py-3 text-sm text-fg placeholder:text-faint focus:border-accent-ink focus:outline-none"
        />
      </div>

      {TURNSTILE_SITE_KEY ? <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} /> : null}

      <Button type="submit" size="md" disabled={state === "loading"}>
        {state === "loading" ? "Enviando…" : submitLabel}
      </Button>

      {state === "error" ? (
        <p className="text-sm text-danger" role="alert">
          Algo falló. Inténtalo de nuevo en un momento.
        </p>
      ) : null}
    </form>
  );
}
