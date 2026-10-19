/**
 * "Empieza aquí" — the free dynamic course: the interactive posts in
 * pedagogical order. Single source for the course page, the per-post
 * progress marker and any nav badge. Progress lives in localStorage under
 * COURSE_PROGRESS_KEY as { [slug]: true }.
 */
export const COURSE_SLUGS = [
  "que-es-un-token",
  "temperatura-y-aleatoriedad",
  "cuanto-cuesta-la-ia",
  "cuando-la-ia-alucina",
  "que-es-rag",
  "vida-de-un-prompt",
  "que-es-un-agente",
  "medir-un-sistema",
] as const;

export const COURSE_PROGRESS_KEY = "course-progress";
