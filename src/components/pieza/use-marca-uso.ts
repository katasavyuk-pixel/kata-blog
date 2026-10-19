"use client";

import { useRef } from "react";
import { track } from "@vercel/analytics";

/**
 * One cookieless, PII-free event per mount the first time a reader touches a
 * piece — the same posture as the cost calculator's `calculadora_usada`.
 * Usage without an email is otherwise invisible to the server by design.
 */
export function useMarcaUso(modelo: string) {
  const hecho = useRef(false);
  return () => {
    if (hecho.current) return;
    hecho.current = true;
    track("pieza_usada", { modelo });
  };
}
