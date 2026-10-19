"use client";

import { Children, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Two (up to four) sides of a decision, with an optional verdict.
 *
 * Both sides are always in the HTML. On a wide container they sit side by
 * side; on a narrow one they become tabs built from radio inputs and CSS
 * (`:has()` + a container query in globals.css), so switching works without
 * JavaScript and a crawler reads both. Where `:has()` is missing the sides
 * simply stack. Arrow keys move between tabs, as radios do natively.
 *
 *   <Comparador veredicto="…">
 *     <Lado titulo="A mano">…</Lado>
 *     <Lado titulo="Con revisión">…</Lado>
 *   </Comparador>
 */
export function Comparador({
  veredicto,
  etiqueta = "Comparación",
  modo = "comparar",
  children,
}: {
  veredicto?: ReactNode;
  etiqueta?: string;
  modo?: "comparar" | "explorar";
  children: ReactNode;
}) {
  const uid = useId();
  const lados = Children.toArray(children).filter(isValidElement) as ReactElement<{ titulo?: string }>[];
  if (lados.length < 2 || lados.length > 4) {
    throw new Error(`<Comparador> necesita entre 2 y 4 <Lado>; tiene ${lados.length}.`);
  }

  return (
    <div className="comparador not-prose my-8 border border-border font-sans" data-modo={modo} role="group" aria-label={etiqueta}>
      <div className="comparador-tabs flex border-b border-border" role="radiogroup" aria-label={etiqueta}>
        {lados.map((lado, i) => {
          const id = `${uid}-${i}`;
          return (
            <span key={id} className="contents">
              <input
                type="radio"
                id={id}
                name={uid}
                defaultChecked={i === 0}
                className="comparador-radio peer sr-only"
              />
              <label
                htmlFor={id}
                className="flex min-h-11 flex-1 cursor-pointer items-center justify-center border-b-2 border-transparent px-3 text-center text-[0.875rem] text-muted transition-colors duration-200 hover:text-fg peer-checked:border-accent peer-checked:text-fg peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-[var(--color-ring)]"
              >
                {lado.props.titulo ?? `Opción ${i + 1}`}
              </label>
            </span>
          );
        })}
      </div>
      <div className="comparador-lados">{lados}</div>
      {veredicto ? (
        <p className="border-t border-border px-4 py-3 text-[0.9375rem] leading-relaxed text-fg sm:px-5">
          <span className="mr-2 font-semibold text-accent-ink">Veredicto</span>
          {veredicto}
        </p>
      ) : null}
    </div>
  );
}

export function Lado({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("comparador-lado pieza-cuerpo px-4 py-4 sm:px-5", className)} aria-label={titulo}>
      <h3 className="comparador-titulo text-[0.9375rem] font-semibold text-fg">{titulo}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
