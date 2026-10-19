/**
 * Subject lines of the emails a subscriber gets, each led by one emoji that says
 * what is inside. Kata, 2026-10-16: a plain subject gives no reason to open it;
 * the gift emoji does. tests/asuntos.test.ts holds these, the welcome sequence
 * (content/emails) and every approved edition not yet sent to the same rule.
 */
export const ASUNTOS = {
  confirmacion: "🎁 Confirma tu suscripción y te mando tu regalo",
  regalo: "🎁 Aquí tienes tu regalo",
  recurso: "📥 Aquí tienes lo que pediste",
} as const;

/** One emoji (with its variation selector, if any) and a space, at the very start. */
export const EMPIEZA_CON_EMOJI = /^\p{Extended_Pictographic}\p{Emoji_Component}*\s/u;
