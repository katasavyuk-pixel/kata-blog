"use client";

import Image from "next/image";
import {
  Children,
  isValidElement,
  useId,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { controlClass } from "./marco";

const subscribe = () => () => {};

/** False on the server and during hydration, true after: no effect, no setState. */
function useMejorado() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

/**
 * A sequence the reader walks one step at a time.
 *
 * The steps are MDX children (`<Paso titulo="…">…</Paso>`), so all of them are
 * in the server HTML as an ordered list, readable top to bottom without
 * JavaScript. Once hydrated, the list becomes a stepper: one step visible,
 * numbered tabs and previous/next. Hiding is CSS on `data-activo`
 * (globals.css), so nothing is unmounted and find-in-page still works on
 * the server render. Changing step is instant — no transition to reduce.
 */
export function PasoAPaso({
  etiqueta = "Paso a paso",
  children,
}: {
  etiqueta?: string;
  children: ReactNode;
}) {
  const pasos = Children.toArray(children).filter(isValidElement) as ReactElement<{ titulo?: string }>[];
  if (pasos.length < 2 || pasos.length > 8) {
    throw new Error(`<PasoAPaso> necesita entre 2 y 8 <Paso>; tiene ${pasos.length}.`);
  }
  const mejorado = useMejorado();
  const [activo, setActivo] = useState(0);
  const uid = useId();
  const ultimo = pasos.length - 1;

  return (
    <div
      className="paso-a-paso font-sans"
      data-mejorado={mejorado ? "true" : undefined}
      data-activo={activo + 1}
      aria-label={etiqueta}
      role="group"
    >
      {mejorado ? (
        <div className="grid border-b border-border" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
          {pasos.map((paso, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActivo(i)}
              aria-current={i === activo ? "step" : undefined}
              aria-controls={`${uid}-lista`}
              className={cn(
                "flex min-h-11 cursor-pointer flex-col items-start justify-center gap-0.5 border-b-2 px-2 py-2 text-left transition-colors duration-200 hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-ring)] sm:px-3",
                i === activo ? "border-accent text-fg" : "border-transparent text-muted",
              )}
            >
              <span className={cn("text-[0.8125rem] font-semibold tabular-nums", i <= activo ? "text-accent-ink" : "text-faint")}>{i + 1}</span>
              <span className="hidden truncate text-[0.8125rem] sm:block">{paso.props.titulo}</span>
              <span className="sr-only sm:hidden">{paso.props.titulo}</span>
            </button>
          ))}
        </div>
      ) : null}

      <ol id={`${uid}-lista`} className="paso-a-paso-lista">
        {pasos}
      </ol>

      {mejorado ? (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <button type="button" onClick={() => setActivo((a) => Math.max(0, a - 1))} disabled={activo === 0} className={controlClass}>
            <Icon name="chevron-left" />
            Anterior
          </button>
          <span className="text-[0.8125rem] tabular-nums text-muted">
            {activo + 1} / {pasos.length}
          </span>
          <button type="button" onClick={() => setActivo((a) => Math.min(ultimo, a + 1))} disabled={activo === ultimo} className={controlClass}>
            Siguiente
            <Icon name="chevron-right" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One step. `captura` is an image path under /public (a real screenshot, never
 * one with client data); `capturaAlt` is required with it.
 */
export function Paso({
  titulo,
  captura,
  capturaAlt,
  capturaAncho = 1200,
  capturaAlto = 675,
  children,
}: {
  titulo: string;
  captura?: string;
  capturaAlt?: string;
  capturaAncho?: number;
  capturaAlto?: number;
  children: ReactNode;
}) {
  if (captura && !capturaAlt) throw new Error(`<Paso titulo="${titulo}" captura>: falta capturaAlt.`);
  return (
    <li className="paso border-b border-border py-5 last:border-b-0">
      <h3 className="flex items-baseline gap-3 text-[1rem] font-semibold text-fg">
        <span className="paso-numero shrink-0 text-[0.8125rem] font-semibold text-accent-ink" aria-hidden />
        {titulo}
      </h3>
      <div className="pieza-cuerpo mt-3">{children}</div>
      {captura ? (
        <figure className="mt-4 border border-border bg-surface">
          <Image src={captura} alt={capturaAlt!} width={capturaAncho} height={capturaAlto} sizes="(min-width: 1024px) 50vw, 100vw" className="h-auto w-full" />
        </figure>
      ) : null}
    </li>
  );
}
