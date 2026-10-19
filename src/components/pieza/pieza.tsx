"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Marco } from "./marco";

/**
 * A piece: the frame plus a shared slot for its state.
 *
 * Written in MDX as
 *
 *   <Pieza titulo="…" supuestos="…" formula="…">
 *     <Puntuador modelo="prioridad-procesos" />
 *     <EnviarResultado magnet="prioridad-procesos" />
 *   </Pieza>
 *
 * The children are MDX, so they are server-rendered into the HTML. The
 * context exists so `EnviarResultado` can send exactly what the reader is
 * looking at — the interactive child publishes its validated inputs here, the
 * form reads them at submit time. Nothing else lives in it.
 */
type Estado = { modelo: string; entrada: unknown; ejemplo: boolean } | null;

const PiezaContext = createContext<{
  estado: Estado;
  publicar: (estado: Estado) => void;
} | null>(null);

export function Pieza({
  titulo,
  supuestos,
  formula,
  pie,
  children,
  className,
}: {
  titulo: string;
  supuestos?: ReactNode;
  formula?: ReactNode;
  pie?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [estado, setEstado] = useState<Estado>(null);
  const publicar = useCallback((next: Estado) => setEstado(next), []);
  const value = useMemo(() => ({ estado, publicar }), [estado, publicar]);

  return (
    <PiezaContext.Provider value={value}>
      <Marco titulo={titulo} supuestos={supuestos} formula={formula} pie={pie} className={className ?? "my-10"}>
        {children}
      </Marco>
    </PiezaContext.Provider>
  );
}

/** For the interactive child. Null outside a `Pieza` — the child still works. */
export function usePieza() {
  return useContext(PiezaContext);
}
