"use client";

import { useState, type ReactNode } from "react";

/**
 * The one thing about the mural that needs JavaScript: a way to stop it. Moving
 * content beside the text has to be pausable (WCAG 2.2.2), and hovering only
 * works with a mouse. Hover and keyboard focus also stop it, in CSS; with
 * `prefers-reduced-motion` it never moves (globals.css, «mural»).
 */
export function MuralMovimiento({ children }: { children: ReactNode }) {
  const [pausado, setPausado] = useState(false);

  return (
    <div className="relative">
      <div className="mural" data-pausado={pausado ? "true" : undefined}>
        {children}
      </div>
      <button
        type="button"
        aria-pressed={pausado}
        onClick={() => setPausado((p) => !p)}
        className="mural-pausa mt-2 min-h-9 font-sans text-[0.8125rem] text-muted underline decoration-border underline-offset-[0.18em] hover:text-fg"
      >
        {pausado ? "Reanudar el movimiento" : "Parar el movimiento"}
      </button>
    </div>
  );
}
