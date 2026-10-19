"use client";

import { useId, type CSSProperties } from "react";

/**
 * Accessible labelled slider control. Native range input = keyboard + ARIA for
 * free. It draws the same `.deslizador` as the pieces' calculator (globals.css):
 * one slider on the site, 44px tall, the filled track is the value.
 */
export function Param({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3 text-[0.9375rem]">
        <label htmlFor={id} className="font-medium text-fg">
          {label}
        </label>
        <span className="font-semibold text-accent-ink">
          {format ? format(value) : value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="deslizador"
        style={{ "--p": `${pct}%` } as CSSProperties}
      />
    </div>
  );
}
