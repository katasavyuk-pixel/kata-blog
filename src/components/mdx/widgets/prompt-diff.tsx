"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { WidgetFrame } from "./widget-frame";

export type PromptSide = {
  label: string;
  prompt: string;
  output: string;
  note?: string;
};

/** Side-by-side A/B of two prompts and their (pre-baked) outputs. */
export function PromptDiff({
  a,
  b,
  caption,
}: {
  a: PromptSide;
  b: PromptSide;
  caption?: string;
}) {
  const [side, setSide] = useState<"a" | "b">("a");
  const current = side === "a" ? a : b;

  return (
    <WidgetFrame title="Comparativa" caption={caption}>
      <div
        role="tablist"
        aria-label="Comparar prompts"
        className="inline-flex rounded-full border border-border bg-surface p-0.5"
      >
        {(["a", "b"] as const).map((key) => {
          const data = key === "a" ? a : b;
          const active = side === key;
          return (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setSide(key)}
              className={cn(
                "min-h-11 rounded-full px-4 text-[0.875rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
                active
                  ? "bg-accent text-on-accent"
                  : "text-muted hover:text-fg",
              )}
            >
              {data.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div>
          <p className="text-[0.8125rem] font-semibold text-muted">
            Prompt
          </p>
          <pre className="mt-1 overflow-x-auto border border-border bg-surface p-3 font-mono text-sm text-fg">
            {current.prompt}
          </pre>
        </div>
        <div>
          <p className="text-[0.8125rem] font-semibold text-muted">
            Respuesta
          </p>
          <div className="mt-1 border border-border p-3 text-[0.9375rem] leading-relaxed text-fg">
            {current.output}
          </div>
        </div>
        {current.note ? (
          <p className="text-[0.9375rem] text-accent-ink">{current.note}</p>
        ) : null}
      </div>
    </WidgetFrame>
  );
}
