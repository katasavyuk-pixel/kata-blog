"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EXAMPLE_TASKS, makeTaskPlan, PLAN_MINUTES } from "@/lib/no-me-da-la-vida";

/**
 * «No me da la vida» on the home, with its own example list: the reader ticks
 * and unticks and sees what fits in 25 minutes, worked out by the tool's own
 * function (src/lib/no-me-da-la-vida.ts). Nothing is stored; the full tool,
 * with the reader's own tasks, is one click away.
 */
export function PlanificadorEjemplo() {
  const [fuera, setFuera] = useState<ReadonlySet<string>>(new Set());
  const plan = useMemo(
    () => makeTaskPlan(EXAMPLE_TASKS.map((task) => ({ ...task, done: fuera.has(task.id) }))),
    [fuera],
  );

  function alternar(id: string) {
    setFuera((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  const primera = plan.selected[0];

  return (
    <div className="border border-border bg-surface p-4 font-sans">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[1rem] font-bold">¿Qué cabe en los próximos {PLAN_MINUTES} minutos?</h3>
        <span className="border border-faint px-2 text-[0.8125rem] text-muted">Ejemplo</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {EXAMPLE_TASKS.map((task) => {
          const marcada = !fuera.has(task.id);
          return (
            <li key={task.id}>
              <button
                type="button"
                aria-pressed={marcada}
                onClick={() => alternar(task.id)}
                className="flex min-h-11 w-full items-center gap-3 rounded-sm border border-border bg-bg px-3 text-left text-[0.9375rem] text-fg hover:border-faint"
              >
                <span
                  aria-hidden
                  className={
                    marcada
                      ? "flex size-5 shrink-0 items-center justify-center rounded-sm border border-accent bg-accent text-on-accent"
                      : "flex size-5 shrink-0 items-center justify-center rounded-sm border border-faint bg-bg"
                  }
                >
                  {marcada ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">{task.name}</span>
                <span className="shrink-0 text-muted">{task.minutes} min</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="mt-3 h-2.5 border border-border bg-bg">
        <div className="h-full bg-accent" style={{ width: `${Math.round((plan.used / PLAN_MINUTES) * 100)}%` }} />
      </div>
      <p role="status" className="mt-2.5 text-[0.9375rem] font-bold">
        {primera
          ? `Caben ${plan.selected.length} ${plan.selected.length === 1 ? "tarea" : "tareas"}: ${plan.used} de ${PLAN_MINUTES} minutos. Empieza por «${primera.name.toLowerCase()}».`
          : "No has marcado nada que quepa."}
      </p>
      {plan.parked.length > 0 ? (
        <ul className="mt-1 space-y-1 text-[0.875rem] leading-snug text-muted">
          {plan.parked.map((task) => (
            <li key={task.id}>
              <span className="text-fg">Aparcada: {task.name.toLowerCase()}.</span> {task.reason}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-[0.9375rem]">
        <Link href="/herramientas/no-me-da-la-vida" className="font-semibold text-accent-ink underline underline-offset-[0.18em]">
          Úsala con tus tareas
        </Link>
      </p>
    </div>
  );
}
