"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Edicion = { issue: string; title: string; date: string; estado: string };

type Respuesta = { ok: boolean; issue?: string; to?: string; error?: string };

const mensajes: Record<string, string> = {
  no_autorizado: "La sesión del panel ha caducado. Vuelve a entrar.",
  origen_no_autorizado: "La petición no procede de este sitio.",
  panel_no_configurado: "El panel no está configurado.",
  error_interno: "No se pudo mandar la prueba. Revisa los registros del servidor.",
};

/**
 * «Mandarme una prueba»: any edition, drafts included, to the reply-to inbox
 * only, with «[PRUEBA]» in the subject. Nothing about the list changes, so it
 * needs no dry run and no confirmation, unlike the real send above it.
 */
export function NewsletterPrueba({ ediciones }: { ediciones: Edicion[] }) {
  const [issue, setIssue] = useState(ediciones[0]?.issue ?? "");
  const [enviando, setEnviando] = useState(false);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);

  async function mandar() {
    if (!issue || enviando) return;
    setEnviando(true);
    setRespuesta(null);
    try {
      const res = await fetch("/panel/newsletter/prueba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue }),
      });
      setRespuesta((await res.json().catch(() => ({ ok: false, error: "error_interno" }))) as Respuesta);
    } catch {
      setRespuesta({ ok: false, error: "conexión" });
    } finally {
      setEnviando(false);
    }
  }

  if (ediciones.length === 0) return <p className="mt-3 text-sm text-muted">No hay ediciones.</p>;

  return (
    <div className="mt-4 max-w-2xl space-y-4 border border-border bg-surface p-5">
      <div>
        <label htmlFor="newsletter-prueba" className="block text-sm font-medium text-fg">
          Edición
        </label>
        <select
          id="newsletter-prueba"
          value={issue}
          onChange={(event) => {
            setIssue(event.target.value);
            setRespuesta(null);
          }}
          disabled={enviando}
          className="mt-2 h-11 w-full border border-border bg-bg px-3 text-sm text-fg"
        >
          {ediciones.map((edicion) => (
            <option key={edicion.issue} value={edicion.issue}>
              {edicion.date} · {edicion.title} ({edicion.estado})
            </option>
          ))}
        </select>
      </div>

      <Button type="button" variant="secondary" onClick={() => void mandar()} disabled={enviando}>
        {enviando ? "Mandando…" : "Mandarme una prueba"}
      </Button>

      {respuesta?.ok ? (
        <p role="status" className="text-sm text-fg">
          Mandada a <strong>{respuesta.to}</strong>, con «[PRUEBA]» en el asunto. Si no la ves en un par de minutos,
          mira en spam y en Promociones.
        </p>
      ) : respuesta ? (
        <p role="alert" className="text-sm text-danger">
          {mensajes[respuesta.error ?? ""] ?? respuesta.error ?? "No se pudo mandar la prueba."}
        </p>
      ) : null}
    </div>
  );
}
