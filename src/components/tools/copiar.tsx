"use client";

import { useState } from "react";

/**
 * Copies a block of text and says so. Without the Clipboard API it falls back to
 * a selected textarea; when that fails too, the text is still on the page to
 * select by hand, and the button says so.
 */
export function Copiar({ texto, etiqueta = "Copiar" }: { texto: string; etiqueta?: string }) {
  const [estado, setEstado] = useState<"listo" | "copiado" | "error">("listo");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Older browsers, and pages inside a frame without clipboard permission:
      // the old way, through a selected textarea, still works in most of them.
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const hecho = document.execCommand("copy");
      area.remove();
      if (!hecho) {
        setEstado("error");
        return;
      }
    }
    setEstado("copiado");
    setTimeout(() => setEstado("listo"), 2500);
  }

  return (
    <span className="inline-flex items-center gap-3 font-sans">
      <button
        type="button"
        onClick={() => void copiar()}
        className="inline-flex min-h-11 items-center bg-accent px-5 text-[0.9375rem] font-bold text-on-accent transition-colors hover:bg-accent-strong"
      >
        {etiqueta}
      </button>
      <span role="status" className="text-[0.8125rem] text-muted">
        {estado === "copiado" ? "Copiada. Pégala en tu IA." : estado === "error" ? "No he podido copiarla: selecciónala a mano." : ""}
      </span>
    </span>
  );
}
