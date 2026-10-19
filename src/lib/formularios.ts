import type { Post } from "@/lib/posts";

/**
 * One signup form per page (DESIGN.md, rule 4), counted across the article
 * body and its closing.
 *
 * Three things put a form inside the body: `<SuscripcionInline />` (every
 * daily edition carries one between two items), `<EnviarResultado />` (a
 * piece that sends its own result) and `<CostCalculator captureMode />`. The
 * closing used to add a second form under all of them. Now it adds its own only
 * when the body has none, and otherwise points to the one above.
 *
 * Pure, over the compiled MDX: the components a body uses are named in its
 * code, and `captureMode` is compiled as `captureMode:!0`.
 * tests/formularios.test.ts runs it over every published post.
 */

const FORMULARIO_EN_CUERPO = /\b(SuscripcionInline|EnviarResultado)\b|captureMode:!0/;

export function cuerpoConFormulario(post: Pick<Post, "content">): boolean {
  return FORMULARIO_EN_CUERPO.test(post.content);
}

/**
 * Where the body's form is, for the closing's link. `EnviarResultado` keeps
 * the id of its own heading; the other two carry `id="suscripcion"`.
 */
export function anclaDelFormulario(post: Pick<Post, "content">): string {
  return /\bEnviarResultado\b/.test(post.content) ? "#enviar-resultado" : "#suscripcion";
}
