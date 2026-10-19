"use client";

import { useEffect, useMemo, useState } from "react";
import { track } from "@vercel/analytics";
import { WidgetFrame } from "@/components/mdx/widgets/widget-frame";
import { Icon } from "@/components/ui/icon";
import {
  EXAMPLE_TASKS,
  isValidPlanningTask,
  makeTaskPlan,
  newTaskId,
  PLAN_MINUTES,
  type PlanningTask,
} from "@/lib/no-me-da-la-vida";

const STORAGE_KEY = "kata:no-me-da-la-vida:v1";

function readTasks(): PlanningTask[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidPlanningTask)) return null;
    if (new Set(parsed.map((task) => task.id)).size !== parsed.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function TaskRow({
  task,
  onToggle,
  onRemove,
}: {
  task: PlanningTask;
  onToggle: (done: boolean) => void;
  onRemove: () => void;
}) {
  const checkboxId = `no-me-da-la-vida-${task.id}`;
  return (
    <li className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <input
        id={checkboxId}
        type="checkbox"
        checked={task.done}
        onChange={(event) => onToggle(event.target.checked)}
        className="size-5 shrink-0 cursor-pointer accent-accent"
      />
      <label
        htmlFor={checkboxId}
        className={`min-w-0 flex-1 cursor-pointer text-[0.9375rem] leading-relaxed ${task.done ? "text-faint line-through" : "text-fg"}`}
      >
        {task.name}
      </label>
      <span className="shrink-0 text-[0.8125rem] tabular-nums text-muted">
        {task.minutes} min
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${task.name}`}
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-faint transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
      >
        <Icon name="cross" />
      </button>
    </li>
  );
}

export function NoMeDaLaVida() {
  const [tasks, setTasks] = useState<PlanningTask[]>(EXAMPLE_TASKS);
  const [planned, setPlanned] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasExamples, setHasExamples] = useState(true);
  const [storageWarning, setStorageWarning] = useState("");
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("10");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readTasks();
      if (stored) {
        setTasks(stored);
        setHasExamples(false);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const plan = useMemo(() => makeTaskPlan(tasks), [tasks]);
  const pending = tasks.filter((task) => !task.done);

  function persist(next: PlanningTask[]) {
    setTasks(next);
    setHasExamples(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageWarning("");
    } catch {
      setStorageWarning("No se puede guardar en este navegador. La lista seguirá aquí hasta cerrar la página.");
    }
  }

  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    const value = Number(minutes);
    if (!trimmed || !Number.isInteger(value) || value < 1 || value > 480) return;
    persist([...tasks, { id: newTaskId(), name: trimmed, minutes: value, done: false }]);
    track("plan_25_minutos_tarea_anadida");
    setName("");
  }

  function updateTask(id: string, update: Partial<PlanningTask>) {
    persist(tasks.map((task) => (task.id === id ? { ...task, ...update } : task)));
  }

  return (
    <WidgetFrame
      title="Bloque de 25 minutos"
      caption="El plan conserva el orden de tu lista, no parte tareas y nunca ocupa más de 25 minutos. Se guarda solo en este navegador."
      onReset={() => {
        persist(EXAMPLE_TASKS);
        setPlanned(false);
      }}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.82fr)]">
        <section aria-labelledby="lista-25-minutos">
          <div className="flex items-baseline justify-between gap-4">
            <h3 id="lista-25-minutos" className="text-[1.25rem] text-fg">
              Lo que tienes en mente
            </h3>
            <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[0.8125rem] tabular-nums text-muted">
              {pending.length} pendientes
            </span>
          </div>
          <p className="mt-2 text-[0.9375rem] text-muted">Una cosa por línea. Sin tener que poder con todo.</p>

          <form onSubmit={addTask} className="mt-6 border border-border bg-surface/45 p-4">
            <label htmlFor="task-name" className="text-[0.9375rem] font-medium text-fg">
              ¿Qué necesitas hacer?
            </label>
            <input
              id="task-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Ej. responder ese correo"
              required
              className="mt-2 h-11 w-full rounded-sm border border-border bg-panel px-3 text-[0.9375rem] text-fg placeholder:text-faint"
            />
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="task-minutes" className="text-[0.8125rem] text-muted">
                  Tiempo estimado
                </label>
                <div className="relative mt-1">
                  <input
                    id="task-minutes"
                    type="number"
                    min={1}
                    max={480}
                    step={1}
                    value={minutes}
                    onChange={(event) => setMinutes(event.target.value)}
                    className="h-11 w-28 rounded-sm border border-border bg-panel px-3 pr-12 text-[0.9375rem] tabular-nums text-fg"
                  />
                  <span className="pointer-events-none absolute right-3 top-3 text-[0.8125rem] text-muted">min</span>
                </div>
              </div>
              <button
                type="submit"
                className="h-11 flex-1 cursor-pointer rounded-sm bg-accent px-4 text-[0.9375rem] font-semibold text-on-accent transition-colors hover:bg-accent-strong sm:flex-none"
              >
                Añadir tarea
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-border">
            {tasks.length > 0 ? (
              <ul aria-label="Lista de tareas" className="mt-1">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={(done) => updateTask(task.id, { done })}
                    onRemove={() => persist(tasks.filter((item) => item.id !== task.id))}
                  />
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-[0.9375rem] text-muted">Tu lista está en blanco. Añade lo primero que tengas en mente.</p>
            )}
          </div>
          {hasExamples ? <p className="mt-3 text-[0.8125rem] text-muted">Empiezas con tres ejemplos. Puedes completarlos o quitarlos.</p> : null}
          {storageWarning ? <p className="mt-3 text-[0.8125rem] text-danger" role="status">{storageWarning}</p> : null}
          {!hydrated ? <p className="sr-only" role="status">Cargando tu lista local</p> : null}
        </section>

        <section aria-labelledby="plan-25-minutos" className="border border-border bg-surface p-5">
          <p className="text-[0.8125rem] font-semibold text-accent-ink">Tu margen de hoy</p>
          <div className="mt-2 flex items-end gap-3">
            <strong className="font-display text-7xl font-normal leading-none lining-nums text-fg">25</strong>
            <span className="pb-1 text-[0.9375rem] leading-snug text-muted">minutos<br />disponibles</span>
          </div>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">Un bloque pequeño. Un avance de verdad.</p>
          <button
            id="organize-25-minutes"
            type="button"
            onClick={() => {
              setPlanned(true);
              track("plan_25_minutos_organizado");
            }}
            className="mt-5 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-sm bg-accent px-4 py-3 text-[0.9375rem] font-semibold text-on-accent transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
          >
            Organizar mis 25 minutos
          </button>
          <p className="mt-3 text-center text-[0.8125rem] text-muted">En orden, sin partir tareas y sin pasarnos.</p>

          {planned ? (
            <div className="mt-6 border-t border-border pt-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id="plan-25-minutos" className="text-[1.0625rem] text-fg">Tu bloque</h3>
                <span className="text-[0.8125rem] tabular-nums text-muted">{plan.used} de {PLAN_MINUTES} min</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
                <div className="h-full rounded-full bg-accent" style={{ width: `${(plan.used / PLAN_MINUTES) * 100}%` }} />
              </div>
              <p className="mt-2 text-right text-[0.8125rem] tabular-nums text-muted">{plan.remaining} min libres</p>

              {!pending.length ? (
                <p className="mt-5 text-[0.9375rem] leading-relaxed text-muted">Todo completado. Ese tiempo también puede ser para ti.</p>
              ) : !plan.selected.length ? (
                <p className="mt-5 text-[0.9375rem] leading-relaxed text-muted">Ninguna tarea cabe entera. Añade un primer paso de 25 minutos o menos.</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {plan.selected.map((task, index) => (
                    <li key={task.id} className="flex items-start gap-2.5 text-[0.9375rem]">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-panel text-[0.75rem] font-semibold tabular-nums text-accent-ink">{index + 1}</span>
                      <span className="min-w-0 flex-1 leading-relaxed text-fg">{task.name}</span>
                      <span className="shrink-0 text-[0.8125rem] tabular-nums text-muted">{task.minutes} min</span>
                    </li>
                  ))}
                </ol>
              )}

              {plan.parked.length > 0 ? (
                <div className="mt-6 border-t border-dashed border-border pt-4">
                  <h4 className="text-[0.9375rem] text-fg">Para otro momento ({plan.parked.length})</h4>
                  <ul className="mt-3 space-y-4">
                    {plan.parked.map((task) => (
                      <li key={task.id}>
                        <p className="text-[0.9375rem] text-fg">{task.name}</p>
                        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{task.reason}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : pending.length > 0 ? (
                <p className="mt-5 text-[0.8125rem] leading-relaxed text-muted">Todo lo pendiente cabe. No hace falta llenar los minutos libres.</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 border-t border-border pt-5 text-center">
              <p className="font-display text-[1.125rem] text-fg">Aquí empieza un poco de calma.</p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">Añade tus tareas y mira lo que cabe.</p>
            </div>
          )}
        </section>
      </div>
    </WidgetFrame>
  );
}
