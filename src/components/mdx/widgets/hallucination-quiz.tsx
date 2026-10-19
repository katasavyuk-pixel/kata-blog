"use client";

import { useLocalState } from "@/hooks/use-local-state";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { WidgetFrame } from "./widget-frame";

export type HallucinationItem = {
  claim: string;
  fake: boolean; // true = inventada
  tell: string; // la pista / explicación
};

/**
 * "Spot the hallucination": the reader flags each statement as real or made-up,
 * then reveals the answer + the tell. Builds the critical-literacy muscle
 * (fluent ≠ correct). Curated static content, answers in localStorage.
 */
export function HallucinationQuiz({
  id,
  items,
}: {
  id: string;
  items: HallucinationItem[];
}) {
  const [marks, setMarks] = useLocalState<Record<number, boolean>>(
    `halu:${id}`,
    {},
  );
  const [revealed, setRevealed] = useLocalState<boolean>(`halu-rev:${id}`, false);

  const answeredCount = Object.keys(marks).length;
  const score = items.reduce(
    (acc, item, i) => acc + (marks[i] === item.fake ? 1 : 0),
    0,
  );

  return (
    <WidgetFrame
      title="Caza la alucinación"
      onReset={
        revealed || answeredCount > 0
          ? () => {
              setMarks({});
              setRevealed(false);
            }
          : undefined
      }
      caption="Una IA suena igual de segura cuando acierta que cuando se lo inventa. Marca cada afirmación y descubre el truco para detectarlas."
    >
      <ul className="flex flex-col gap-3">
        {items.map((item, i) => {
          const mark = marks[i];
          const correct = revealed && mark === item.fake;
          return (
            <li
              key={i}
              className="border border-border p-3.5"
            >
              <p className="text-[0.9375rem] leading-relaxed text-fg">{item.claim}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {[
                  { label: "Real", val: false },
                  { label: "Inventada", val: true },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    disabled={revealed}
                    aria-pressed={mark === opt.val}
                    onClick={() => setMarks({ ...marks, [i]: opt.val })}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-sm border px-4 text-[0.875rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] disabled:cursor-not-allowed",
                      mark === opt.val
                        ? "border-accent bg-accent text-on-accent"
                        : "border-border text-muted hover:bg-surface hover:text-fg",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                {revealed ? (
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center gap-1 text-[0.875rem] font-semibold",
                      correct ? "text-accent-ink" : "text-danger",
                    )}
                  >
                    <Icon name={correct ? "check" : "cross"} />
                    {correct ? "Acertaste" : "Era " + (item.fake ? "inventada" : "real")}
                  </span>
                ) : null}
              </div>
              {revealed ? (
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
                  {item.tell}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!revealed ? (
        <div className="mt-4">
          <Button
            size="sm"
            onClick={() => setRevealed(true)}
            disabled={answeredCount < items.length}
          >
            {answeredCount < items.length
              ? `Marca las ${items.length} (${answeredCount}/${items.length})`
              : "Comprobar"}
          </Button>
        </div>
      ) : (
        <p className="mt-4 font-display text-[1.25rem] leading-snug text-fg" aria-live="polite">
          Acertaste {score} de {items.length}.
        </p>
      )}
    </WidgetFrame>
  );
}
