"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Param } from "./param";
import { WidgetFrame } from "./widget-frame";

const STEPS = ["plan", "busca", "razona", "ejecuta", "revisa"];

function autonomyLabel(level: number): string {
  switch (level) {
    case 1:
      return "Cada paso lo apruebas tú antes de que el agente siga.";
    case 2:
      return "El agente ejecuta los pasos y se detiene solo al final.";
    case 3:
      return "El agente decide los pasos y continúa hasta terminar.";
    default:
      return "";
  }
}

/**
 * Una maqueta honesta del bucle de un agente — esquemática, sin model call.
 * El "riesgo" que muestra es un heurístico explicativo (pasos × temperatura),
 * no una medida real de un modelo.
 */
export function AgentLoop() {
  const [steps, setSteps] = useState(3);
  const [autonomy, setAutonomy] = useState(2);
  const [temperature, setTemperature] = useState(0.5);

  const shown = useMemo(() => STEPS.slice(0, steps), [steps]);
  const drift = Math.min(100, Math.round(steps * (0.35 + temperature * 0.45) * 40));

  return (
    <WidgetFrame
      title="El bucle de un agente"
      onReset={() => {
        setSteps(3);
        setAutonomy(2);
        setTemperature(0.5);
      }}
      caption={
        <>
          Es un esquema, no un modelo real: el «riesgo de desviarse» es un
          heurístico (pasos × temperatura) para que veas la dirección, no un
          número medido. La lección es que más pasos y menos supervisión no son
          gratis.
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Param
          label="Pasos del bucle"
          value={steps}
          min={1}
          max={5}
          onChange={setSteps}
        />
        <Param
          label="Autonomía"
          value={autonomy}
          min={1}
          max={3}
          onChange={setAutonomy}
        />
        <Param
          label="Temperatura"
          value={temperature}
          min={0}
          max={1}
          step={0.05}
          onChange={setTemperature}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <p className="mt-4 text-[0.9375rem] text-muted">{autonomyLabel(autonomy)}</p>

      <ol className="mt-4 flex flex-wrap gap-2">
        {shown.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.8125rem] text-fg">
              <span className="font-semibold tabular-nums text-accent-ink">{i + 1}</span> {step}
            </span>
            {i < shown.length - 1 ? <Icon name="chevron-right" className="text-faint" /> : null}
          </li>
        ))}
      </ol>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[0.8125rem] font-semibold text-muted">
            Riesgo de desviarse del plan
          </span>
          <span className="text-[0.9375rem] font-semibold tabular-nums text-accent-ink">
            {drift}%
          </span>
        </div>
        <span className="relative mt-1.5 block h-3 overflow-hidden rounded bg-surface-2">
          <span
            className="absolute inset-y-0 left-0 rounded bg-accent transition-[width]"
            style={{ width: `${drift}%` }}
          />
        </span>
      </div>
    </WidgetFrame>
  );
}
