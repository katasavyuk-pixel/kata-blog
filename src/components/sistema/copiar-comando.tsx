"use client";

import { useState } from "react";
import { copyText } from "@/lib/copy-text";

/**
 * A command the reader runs somewhere else, with a button to copy it.
 *
 * The text is in the HTML and selectable, so it works with JavaScript off and
 * a crawler reads it; the button only saves the selection. When the clipboard
 * refuses (in-app browsers, non-secure contexts) it says so instead of
 * pretending — the reader can still select the line.
 */
export function CopiarComando({ lineas, etiqueta }: { lineas: readonly string[]; etiqueta: string }) {
  const [estado, setEstado] = useState<"reposo" | "copiado" | "fallo">("reposo");

  async function copiar() {
    const ok = await copyText(lineas.join("\n"));
    setEstado(ok ? "copiado" : "fallo");
    window.setTimeout(() => setEstado("reposo"), 2500);
  }

  return (
    <div className="border border-border bg-surface font-sans">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <span className="font-sans text-[0.8125rem] text-muted">{etiqueta}</span>
        <button
          type="button"
          onClick={copiar}
          className="min-h-9 rounded-sm border border-border px-3 text-[0.8125rem] text-fg transition-colors duration-200 hover:border-chrome focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        >
          {estado === "copiado" ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[0.875rem] leading-relaxed text-fg">
        <code>{lineas.join("\n")}</code>
      </pre>
      {/* Announced without moving focus; empty until there is something to say. */}
      <p role="status" className="px-4 pb-2 text-[0.8125rem] text-muted empty:hidden">
        {estado === "fallo" ? "No he podido copiarlo: selecciona el texto y cópialo a mano." : null}
      </p>
    </div>
  );
}
