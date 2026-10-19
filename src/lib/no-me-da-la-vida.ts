export const PLAN_MINUTES = 25;

export type PlanningTask = {
  id: string;
  name: string;
  minutes: number;
  done: boolean;
};

/**
 * The list a first visit starts with, here and on the home's example: the
 * same three tasks, so what the home shows is what the tool does.
 */
export const EXAMPLE_TASKS: PlanningTask[] = [
  { id: "example-correo", name: "Responder el correo pendiente", minutes: 10, done: false },
  { id: "example-presentacion", name: "Preparar la presentación", minutes: 40, done: false },
  { id: "example-escritorio", name: "Ordenar el escritorio", minutes: 15, done: false },
];

export type ParkedTask = PlanningTask & { reason: string };

export type TaskPlan = {
  selected: PlanningTask[];
  parked: ParkedTask[];
  remaining: number;
  used: number;
};

/**
 * Build a small, explainable plan. We keep the user's order and never split a
 * task: a later, shorter task can still use a gap left by an earlier one.
 */
export function makeTaskPlan(
  tasks: PlanningTask[],
  budget = PLAN_MINUTES,
): TaskPlan {
  let remaining = budget;
  const selected: PlanningTask[] = [];
  const parked: ParkedTask[] = [];

  for (const task of tasks) {
    if (task.done) continue;

    if (task.minutes <= remaining) {
      selected.push(task);
      remaining -= task.minutes;
      continue;
    }

    parked.push({
      ...task,
      reason:
        task.minutes > budget
          ? `Necesita ${task.minutes} min y supera tu bloque de ${budget}. Resérvale otro momento con más tiempo.`
          : `Necesita ${task.minutes} min y al llegar a ella quedaban ${remaining}. Se conserva el orden de tu lista.`,
    });
  }

  return { selected, parked, remaining, used: budget - remaining };
}

export function isValidPlanningTask(value: unknown): value is PlanningTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<PlanningTask>;
  return (
    typeof task.id === "string" &&
    task.id.length > 0 &&
    typeof task.name === "string" &&
    task.name.trim().length > 0 &&
    task.name.length <= 120 &&
    typeof task.minutes === "number" &&
    Number.isInteger(task.minutes) &&
    task.minutes >= 1 &&
    task.minutes <= 480 &&
    typeof task.done === "boolean"
  );
}

export function newTaskId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
