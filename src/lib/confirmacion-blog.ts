import { direccionDe } from "@/lib/email";

/**
 * Double opt-in for kataivanovych.com.
 *
 * The address is the verified `news.ianexora.com` sender (the same one NBI
 * uses). The display name, the reply-to and the copy are not: this message
 * must not introduce itself as the NBI newsletter and must not promise the
 * NBI gift. There is no welcome sequence after the click.
 */
export const RESPUESTA_BLOG = "k.savyuk@ianexora.com";
export const ASUNTO_CONFIRMACION_BLOG = "✉️ Confirma tu suscripción al blog";

export function remitenteBlog(): string {
  return `Kata Ivanovych <${direccionDe(process.env.RESEND_FROM)}>`;
}

function escapar(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function mensajeConfirmacionBlog(confirmUrl: string): {
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
} {
  const enlace = escapar(confirmUrl);
  const text = [
    "Confirma tu suscripción",
    "",
    "Has pedido recibir el blog de Kata Ivanovych (kataivanovych.com) en esta dirección.",
    "Antes de enviarte nada, necesito comprobar que el correo es tuyo.",
    "",
    "Abre esta dirección para confirmar:",
    confirmUrl,
    "",
    "El enlace caduca en 24 horas.",
    "",
    "Si no has sido tú, ignora este mensaje. Sin ese clic no quedarás suscrito",
    "y no recibirás ningún correo.",
    "",
    "Kata Ivanovych · https://kataivanovych.com",
  ].join("\n");

  const html = [
    "<!DOCTYPE html>",
    '<html lang="es"><body style="font-family: sans-serif; line-height: 1.5; color: #1a1a1a;">',
    "<p>Confirma tu suscripción</p>",
    "<p>Has pedido recibir el blog de Kata Ivanovych (kataivanovych.com) en esta dirección. Antes de enviarte nada, necesito comprobar que el correo es tuyo.</p>",
    `<p><a href="${enlace}">Confirmar suscripción</a></p>`,
    `<p>Si el botón no funciona, copia esta dirección:<br>${enlace}</p>`,
    "<p>El enlace caduca en 24 horas. Si no has sido tú, ignora este mensaje: sin ese clic no quedarás suscrito y no recibirás ningún correo.</p>",
    '<p>Kata Ivanovych · <a href="https://kataivanovych.com">kataivanovych.com</a></p>',
    "</body></html>",
  ].join("");

  return {
    from: remitenteBlog(),
    replyTo: RESPUESTA_BLOG,
    subject: ASUNTO_CONFIRMACION_BLOG,
    html,
    text,
  };
}
