"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  CLAVE_LENTE,
  ETIQUETA_DE_LENTE,
  LENTES,
  LENTE_POR_DEFECTO,
  esLente,
  resolverLente,
  type Lente,
} from "@/lib/impacto";
import { cn } from "@/lib/utils";

/**
 * The reader says from which chair they read, once.
 *
 * The truth is `data-lente` on <html>: the inline script sets it before paint
 * and the stylesheet shows the matching reading, so this component never
 * decides what is visible. It only writes the attribute, remembers the choice
 * and keeps the radios in step with it. The server renders the default and the
 * store corrects it after hydration, without a mismatch: what changes on
 * screen was already painted right by CSS.
 *
 * Real radios: arrow keys move between them natively, and with JavaScript off
 * they still switch the reading (globals.css reads `:checked`).
 */
function suscribir(alCambiar: () => void): () => void {
  const observador = new MutationObserver(alCambiar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-lente"] });
  return () => observador.disconnect();
}

function leerLente(): Lente {
  const valor = document.documentElement.dataset.lente;
  return esLente(valor) ? valor : LENTE_POR_DEFECTO;
}

function guardada(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_LENTE);
  } catch {
    return null;
  }
}

function elegir(lente: Lente) {
  document.documentElement.dataset.lente = lente;
  try {
    window.localStorage.setItem(CLAVE_LENTE, lente);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page.
  }
  // A link that names a lens must not go on naming the old one.
  const url = new URL(window.location.href);
  if (url.searchParams.has(CLAVE_LENTE)) {
    url.searchParams.set(CLAVE_LENTE, lente);
    window.history.replaceState(window.history.state, "", url);
  }
}

export function LenteSelector({ className }: { className?: string }) {
  const lente = useSyncExternalStore(suscribir, leerLente, () => LENTE_POR_DEFECTO);

  // Arriving through a client-side navigation, the inline script has not run.
  useEffect(() => {
    document.documentElement.dataset.lente = resolverLente({
      consulta: new URLSearchParams(window.location.search).get(CLAVE_LENTE),
      guardada: guardada(),
    });
  }, []);

  return (
    <fieldset className={cn("lente-selector font-sans", className)}>
      <legend className="font-sans text-[0.8125rem] font-semibold text-fg">¿Desde dónde lo lees?</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {LENTES.map((opcion) => (
          <label key={opcion} className="relative inline-flex cursor-pointer">
            <input
              type="radio"
              name={CLAVE_LENTE}
              value={opcion}
              checked={lente === opcion}
              onChange={() => elegir(opcion)}
              className="lente-radio sr-only"
            />
            <span className="lente-etiqueta inline-flex min-h-11 items-center rounded-sm border border-border px-4 text-[0.9375rem] text-muted transition-colors duration-200">
              {ETIQUETA_DE_LENTE[opcion]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
