import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidPlanningTask,
  makeTaskPlan,
  PLAN_MINUTES,
  type PlanningTask,
} from "@/lib/no-me-da-la-vida";

const task = (id: string, minutes: number, done = false): PlanningTask => ({
  id,
  name: id,
  minutes,
  done,
});

test("organiza tareas completas sin superar los 25 minutos", () => {
  const result = makeTaskPlan([task("correo", 10), task("presentacion", 40), task("mesa", 15)]);

  assert.equal(result.used, PLAN_MINUTES);
  assert.deepEqual(result.selected.map((item) => item.id), ["correo", "mesa"]);
  assert.equal(result.parked.length, 1);
  assert.match(result.parked[0].reason, /supera tu bloque/);
});

test("explica cuando una tarea ya no cabe en el resto", () => {
  const result = makeTaskPlan([task("primera", 20), task("segunda", 10), task("tercera", 5)]);

  assert.deepEqual(result.selected.map((item) => item.id), ["primera", "tercera"]);
  assert.match(result.parked[0].reason, /quedaban 5/);
});

test("ignora completadas y conserva el bloque libre", () => {
  const result = makeTaskPlan([task("hecha", 25, true)]);

  assert.equal(result.used, 0);
  assert.equal(result.remaining, PLAN_MINUTES);
  assert.deepEqual(result.selected, []);
});

test("valida únicamente tareas seguras para recuperar desde localStorage", () => {
  assert.equal(isValidPlanningTask(task("válida", 1)), true);
  assert.equal(isValidPlanningTask({ id: "", name: "x", minutes: 1, done: false }), false);
  assert.equal(isValidPlanningTask({ id: "x", name: "x", minutes: 481, done: false }), false);
  assert.equal(isValidPlanningTask(null), false);
});
