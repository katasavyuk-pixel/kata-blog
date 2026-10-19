"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Param } from "./param";
import { WidgetFrame } from "./widget-frame";

const ITEMS: { answer: string; score: number }[] = [
  { answer: "Devolveré tu pedido. ¿Me confirmas el número para tramitarlo?", score: 88 },
  { answer: "Tu pedido llegará en unos días.", score: 52 },
  { answer: "No se puede devolver.", score: 24 },
];

/**
 * Un banco de pruebas con umbral ajustable: el lector decide qué puntuar como
 * "paso" y comprueba cómo cambia la frontera. Los datos son fijos — el mando es
 * el criterio, que es justo lo que enseña un eval.
 */
export function EvalBench() {
  const [threshold, setThreshold] = useState(60);

  const graded = useMemo(
    () =>
      ITEMS.map((item) => ({
        ...item,
        pass: item.score >= threshold,
      })),
    [threshold],
  );

  return (
    <WidgetFrame
      title="El umbral del banco de pruebas"
      onReset={() => setThreshold(60)}
      caption={
        <>
          Cada respuesta tiene su puntuación fija; lo que mueves es tu criterio.
          Baja el umbral y apruebas respuestas flojas; súbelo y descartas las
          buenas. Elegir ese número es el trabajo real de un sistema.
        </>
      }
    >
      <Param
        label="Umbral de aprobado"
        value={threshold}
        min={0}
        max={100}
        step={5}
        unit="%"
        onChange={setThreshold}
        format={(v) => `${v}%`}
      />

      <div className="mt-4 divide-y divide-border border border-border bg-surface">
        {graded.map((item) => (
          <div key={item.answer} className="flex items-center gap-3 px-4 py-3">
            <span className="flex-1 text-[0.9375rem] text-fg">{item.answer}</span>
            <span className="text-[0.8125rem] tabular-nums text-muted">
              {item.score}/100
            </span>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.8125rem] font-medium ${
                item.pass
                  ? "bg-accent/15 text-accent-ink"
                  : "bg-surface-2 text-muted"
              }`}
            >
              <Icon name={item.pass ? "check" : "cross"} />
              {item.pass ? "Aprueba" : "Descarta"}
            </span>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
