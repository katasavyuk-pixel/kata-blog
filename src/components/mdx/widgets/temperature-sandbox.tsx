"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Param } from "./param";
import { WidgetFrame } from "./widget-frame";

const PROMPT = "El cielo de un día despejado es de color…";

// Pre-baked "logits" for the next token (no model call needed).
const CANDIDATES: { token: string; logit: number }[] = [
  { token: "azul", logit: 4.2 },
  { token: "celeste", logit: 2.4 },
  { token: "gris", logit: 1.9 },
  { token: "blanco", logit: 1.1 },
  { token: "negro", logit: 0.3 },
  { token: "rojo", logit: 0.0 },
  { token: "verde", logit: -0.4 },
  { token: "rosa", logit: -0.7 },
  { token: "naranja", logit: -1.0 },
  { token: "morado", logit: -1.3 },
];

function softmax(logits: number[], temperature: number): number[] {
  const t = Math.max(temperature, 0.01);
  const scaled = logits.map((l) => l / t);
  const max = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function applyTopP(probs: number[], topP: number): number[] {
  if (topP >= 1) return probs;
  const sorted = probs.map((p, i) => [p, i] as const).sort((a, b) => b[0] - a[0]);
  const keep = new Set<number>();
  let cum = 0;
  for (const [p, i] of sorted) {
    keep.add(i);
    cum += p;
    if (cum >= topP) break;
  }
  const filtered = probs.map((p, i) => (keep.has(i) ? p : 0));
  const sum = filtered.reduce((a, b) => a + b, 0) || 1;
  return filtered.map((p) => p / sum);
}

export function TemperatureSandbox() {
  const [temp, setTemp] = useState(0.8);
  const [topP, setTopP] = useState(1);
  const [samples, setSamples] = useState<string[]>([]);

  const probs = useMemo(() => {
    const base = softmax(
      CANDIDATES.map((c) => c.logit),
      temp,
    );
    return applyTopP(base, topP);
  }, [temp, topP]);

  function sample10() {
    const out: string[] = [];
    for (let n = 0; n < 10; n++) {
      let r = Math.random();
      let chosen = CANDIDATES[0].token;
      for (let i = 0; i < probs.length; i++) {
        r -= probs[i];
        if (r <= 0) {
          chosen = CANDIDATES[i].token;
          break;
        }
      }
      out.push(chosen);
    }
    setSamples(out);
  }

  return (
    <WidgetFrame
      title="Temperatura"
      onReset={() => {
        setTemp(0.8);
        setTopP(1);
        setSamples([]);
      }}
      math={
        <p>
          Cada barra es <code className="font-mono">softmax(logit / T)</code>. El{" "}
          <code className="font-mono">top-p</code> (núcleo) conserva los tokens más
          probables hasta sumar <em>p</em> y pone el resto a 0, reescalando.
        </p>
      }
      caption="Sube la temperatura y mira cómo el modelo pasa de seguro y aburrido a diverso y caótico. Las probabilidades están pre-calculadas; no hay llamada a ningún modelo."
    >
      <p className="border border-border bg-surface px-3 py-2 font-mono text-sm text-fg">{PROMPT}</p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Param
          label="Temperatura"
          value={temp}
          min={0}
          max={1.5}
          step={0.05}
          onChange={setTemp}
          format={(v) => v.toFixed(2)}
        />
        <Param
          label="top-p"
          value={topP}
          min={0.1}
          max={1}
          step={0.05}
          onChange={setTopP}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <ul className="mt-4 space-y-1.5">
        {CANDIDATES.map((c, i) => (
          <li key={c.token} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-right font-mono text-[0.8125rem] text-fg">
              {c.token}
            </span>
            <span className="relative h-4 flex-1 overflow-hidden rounded bg-surface-2">
              <span
                className="absolute inset-y-0 left-0 rounded bg-accent transition-[width]"
                style={{ width: `${probs[i] * 100}%` }}
              />
            </span>
            <span className="w-10 shrink-0 text-right text-[0.8125rem] tabular-nums text-muted">
              {(probs[i] * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={sample10}>
          Muestrea 10×
        </Button>
        {samples.length > 0 ? (
          <p className="font-mono text-sm text-fg" aria-live="polite">
            {samples.join(" · ")}
          </p>
        ) : null}
      </div>
    </WidgetFrame>
  );
}
