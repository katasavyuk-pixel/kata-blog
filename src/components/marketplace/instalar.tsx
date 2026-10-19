"use client";

import { useState } from "react";
import { CopiarComando } from "@/components/sistema/copiar-comando";
import { AGENTES } from "@/config/catalogo";
import { formatDate } from "@/lib/format";

/**
 * How to install the whole catalogue, for the agent the reader uses: the Claude
 * app, Claude Code, Codex, OpenCode and the others that read Agent Skills
 * (2026-10-15, Kata: «hay gente que no usa Claude»). Steps, commands and the
 * day each was tested come from config/catalogo.ts, the same list the skill
 * sheets and the repository's README follow. An agent nobody has run them in
 * says so. Without JavaScript the first one shows, the Claude app, which is
 * where most readers are.
 */
export function Instalar() {
  const [id, setId] = useState(AGENTES[0].id);
  const agente = AGENTES.find((a) => a.id === id) ?? AGENTES[0];

  const opcion = (activa: boolean) =>
    activa
      ? "min-h-11 rounded-sm border border-accent bg-accent px-4 text-[0.9375rem] font-semibold text-on-accent"
      : "min-h-11 rounded-sm border border-faint bg-panel px-4 text-[0.9375rem] font-semibold text-fg hover:border-fg";

  return (
    <div className="font-sans">
      <div role="group" aria-label="Dónde usas la IA" className="flex flex-wrap gap-2">
        {AGENTES.map((a) => (
          <button key={a.id} type="button" aria-pressed={a.id === agente.id} onClick={() => setId(a.id)} className={opcion(a.id === agente.id)}>
            {a.nombre}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <p className="text-[0.9375rem] leading-relaxed text-muted">{agente.nota}</p>
        <div className="mt-3">
          <CopiarComando lineas={agente.lineas} etiqueta={agente.etiqueta} />
        </div>
        <p className="mt-2 text-[0.8125rem] text-muted">
          {agente.comprobado ? (
            <>
              Instalado así desde cero el <time dateTime={agente.comprobado}>{formatDate(agente.comprobado)}</time>.
            </>
          ) : (
            <>Según la documentación de {agente.id === "otro" ? "cada agente" : agente.nombre}: no lo he probado.</>
          )}
        </p>
      </div>
    </div>
  );
}
