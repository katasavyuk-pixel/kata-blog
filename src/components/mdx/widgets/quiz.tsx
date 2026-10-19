"use client";

import { useLocalState } from "@/hooks/use-local-state";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { WidgetFrame } from "./widget-frame";

export type QuizOption = { text: string; correct?: boolean; explain: string };

/**
 * Inline knowledge check. The learning lives in the per-option explanations
 * (especially WHY each wrong answer is wrong) — not in a score. No "fail" state,
 * answered-state persisted in localStorage so re-reads remember.
 */
export function Quiz({
  id,
  question,
  options,
}: {
  id: string;
  question: string;
  options: QuizOption[];
}) {
  const [picked, setPicked] = useLocalState<number | null>(`quiz:${id}`, null);
  const answered = picked != null;

  return (
    <WidgetFrame title="Quiz" onReset={answered ? () => setPicked(null) : undefined}>
      <p className="text-[1.0625rem] font-semibold leading-snug text-fg">{question}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {options.map((opt, i) => {
          const isPicked = picked === i;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                aria-pressed={isPicked}
                onClick={() => setPicked(i)}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-3 rounded-sm border px-3.5 py-2.5 text-left text-[0.9375rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
                  !answered &&
                    "cursor-pointer border-border bg-panel hover:border-accent-ink hover:bg-surface",
                  answered && opt.correct && "border-accent bg-surface-2 text-fg",
                  answered &&
                    isPicked &&
                    !opt.correct &&
                    "border-danger bg-surface text-fg",
                  answered &&
                    !isPicked &&
                    !opt.correct &&
                    "border-border text-muted",
                )}
              >
                <span>{opt.text}</span>
                {answered && opt.correct ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-accent-ink">
                    <Icon name="check" />
                    Correcta
                  </span>
                ) : answered && isPicked ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-danger">
                    <Icon name="cross" />
                    Tu respuesta
                  </span>
                ) : null}
              </button>
              {answered ? (
                <p className="mt-1 px-1 text-[0.8125rem] leading-relaxed text-muted">
                  {opt.explain}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </WidgetFrame>
  );
}
