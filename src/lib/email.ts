import { Resend } from "resend";

/**
 * Sender. A dedicated subdomain verified in Resend — today `news.ianexora.com`
 * (DKIM + SPF + MX), sending from eu-west-1.
 *
 * The fallback used to name `news.kataivanovych.com`, a domain that is not
 * verified and not even ours. That is not a graceful default: Resend rejects
 * every send from an unverified domain, so a missing RESEND_FROM turned the
 * whole site silently into "Algo falló" instead of failing where it could be
 * read. It now falls back to the domain that is actually verified.
 */
/**
 * The visible sender is NBI's since 26-nov-2026 (Kata: «Katalin Savyuk
 * (NBI)»). Only the display name changes here: the address still comes from
 * RESEND_FROM (the verified news.ianexora.com domain), so no Resend or env
 * setting has to change for the new name to show.
 */
export const NOMBRE_REMITENTE = "Katalin Savyuk (NBI)";
const DIRECCION_POR_DEFECTO = "news@news.ianexora.com";

/** `Name <address>` or a bare address → the address alone. */
export function direccionDe(remitente: string | undefined): string {
  const valor = remitente?.trim();
  if (!valor) return DIRECCION_POR_DEFECTO;
  const match = /<([^>]+)>/.exec(valor);
  return (match ? match[1] : valor).trim() || DIRECCION_POR_DEFECTO;
}

export const FROM = `${NOMBRE_REMITENTE} <${direccionDe(process.env.RESEND_FROM)}>`;

/**
 * Reply-to for emails that invite replies (welcome sequence). The sending
 * subdomain can't receive mail, so without this env replies would bounce —
 * set RESEND_REPLY_TO to a real, monitored mailbox.
 */
export const REPLY_TO = process.env.RESEND_REPLY_TO || undefined;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}
