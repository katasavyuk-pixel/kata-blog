"use client";

import { useState, type CSSProperties } from "react";
import "./secuencia.css";

export type PasoDeSecuencia = { titulo: string; detalle: string; fallo?: string };

type Estado = "reposo" | "inicio" | "recorriendo";

/**
 * How a system runs, step by step, and where it broke: the web twin of the GIF
 * in the email (scripts/correo/preparar.ts draws that one from the same steps).
 *
 * It renders complete, failures included, and moves only when the reader
 * presses the button: the red dot walks the steps once and each failure
 * appears as the dot reaches it. Under 5 seconds and on request, so it needs
 * no pause (WCAG 2.2.2) and keeps DESIGN.md's «movimiento solo como respuesta».
 */
export function Secuencia({ titulo, pasos }: { titulo: string; pasos: readonly PasoDeSecuencia[] }) {
  const [estado, setEstado] = useState<Estado>("reposo");

  const recorrer = () => {
    // Back to the start for one frame, so the animation runs again from zero.
    setEstado("inicio");
    requestAnimationFrame(() => requestAnimationFrame(() => setEstado("recorriendo")));
  };

  return (
    <figure className="font-sans">
      <figcaption className="text-[0.875rem] font-bold text-fg">{titulo}</figcaption>
      <div
        className="secuencia relative mt-4"
        data-estado={estado === "reposo" ? undefined : estado}
        style={{ "--n": pasos.length } as CSSProperties}
      >
        <div aria-hidden className="secuencia-linea absolute top-[18px] h-0.5 bg-fg" />
        <div
          aria-hidden
          className="secuencia-punto absolute top-[10px] z-10 size-[18px] -translate-x-1/2 rounded-full bg-accent"
          onAnimationEnd={() => setEstado("reposo")}
        />
        <ol className="relative grid text-center" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
          {pasos.map((paso, i) => (
            <li key={paso.titulo} className="flex min-w-0 flex-col items-center gap-1.5 px-1">
              <span aria-hidden className="mt-[13px] size-3 rounded-full border-2 border-fg bg-panel" />
              <span className="mt-1 text-[0.8125rem] font-bold leading-tight text-fg">{paso.titulo}</span>
              <span className="text-[0.75rem] leading-tight text-muted">{paso.detalle}</span>
              {paso.fallo ? (
                <span className="secuencia-fallo text-[0.75rem] font-bold leading-tight text-accent-ink" style={{ "--i": i } as CSSProperties}>
                  <span aria-hidden>✕ </span>
                  <span className="sr-only">Falló: </span>
                  {paso.fallo}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
      <button
        type="button"
        onClick={recorrer}
        className="secuencia-repetir mt-2 min-h-11 text-[0.8125rem] text-muted underline decoration-border underline-offset-[0.18em] hover:text-fg"
      >
        Ver el recorrido
      </button>
    </figure>
  );
}
