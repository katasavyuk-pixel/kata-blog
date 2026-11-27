import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { siteConfig } from "@/config/site";
import { generateToken, hashToken } from "@/lib/tokens";
import { mensajeConfirmacionBlog } from "@/lib/confirmacion-blog";
import {
  URL_SUSCRITO,
  listaDeFormulario,
  origenDeFormularioPermitido,
  type ListaPersonal,
} from "@/lib/listas";

/**
 * `POST /api/alta` — the personal-blog form on kataivanovych.com.
 *
 * Public URL: https://ianexora.com/blog/api/alta (this app's base path).
 * `application/x-www-form-urlencoded`, no Turnstile (that form has none),
 * no NBI gift and no welcome sequence. A well-formed request always answers
 * 303 to the same URL, including when the address is already pending or
 * confirmed on that list, so the redirect does not say whether it was new.
 */

const EmailSchema = z.string().trim().email().max(254);
const VENTANA_MS = 24 * 60 * 60 * 1000;

export type MensajeAlta = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
};

export type DepsAlta = {
  limite: (clave: string) => boolean;
  ahora?: () => Date;
  token?: () => string;
  /** When omitted, storage and mail are assumed to be configured. */
  listo?: () => boolean;
  cliente: () => SupabaseClient;
  enviar: (mensaje: MensajeAlta) => Promise<string | null>;
};

function ipDe(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** `subscribers.consent_ip` is `inet`. A junk forwarded header must not fail the insert. */
function ipDeConsentimiento(ip: string): string | null {
  if (ip === "unknown") return null;
  if (!/^[0-9a-fA-F:.]+$/.test(ip)) return null;
  return ip;
}

function rechazo(status: number, error: string): Response {
  return Response.json(
    { ok: false, error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function suscrito(): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: URL_SUSCRITO, "Cache-Control": "no-store" },
  });
}

function honeypotRelleno(valor: FormDataEntryValue | null): boolean {
  if (typeof valor === "string") return valor.trim() !== "";
  if (valor instanceof File) return valor.size > 0;
  return false;
}

async function buscarEnLista(
  cliente: SupabaseClient,
  email: string,
  lista: ListaPersonal,
): Promise<{ status: string } | null | "error"> {
  const { data, error } = await cliente
    .from("subscribers")
    .select("status")
    .eq("email", email)
    .eq("list", lista)
    .maybeSingle();
  if (error) return "error";
  return (data as { status: string } | null) ?? null;
}

export async function procesarAltaPersonal(request: Request, deps: DepsAlta): Promise<Response> {
  const ip = ipDe(request);
  if (!deps.limite(`alta:${ip}`)) return rechazo(429, "rate_limited");

  if (
    !origenDeFormularioPermitido(request.headers.get("origin"), request.headers.get("referer"))
  ) {
    return rechazo(403, "origin");
  }

  const tipo = request.headers.get("content-type") ?? "";
  if (
    !tipo.includes("application/x-www-form-urlencoded") &&
    !tipo.includes("multipart/form-data")
  ) {
    return rechazo(400, "invalid");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return rechazo(400, "invalid");
  }

  // Filled honeypot: same redirect as a real signup, and nothing is written.
  // Checked before consent so a bot is not told which field to fix.
  if (honeypotRelleno(form.get("website"))) return suscrito();

  // `origen` is a label the form may send. It is never a Location.
  const emailParse = EmailSchema.safeParse(form.get("email"));
  const listaValor = form.get("lista");
  const lista = listaDeFormulario(typeof listaValor === "string" ? listaValor : null);
  const consentimiento = form.get("consentimiento");
  if (consentimiento !== "si") return rechazo(400, "consent");
  if (!emailParse.success || !lista) return rechazo(400, "invalid");

  if (deps.listo && !deps.listo()) return rechazo(503, "not_configured");

  const email = emailParse.data;
  const ahora = (deps.ahora ?? (() => new Date()))();
  const token = (deps.token ?? generateToken)();
  const cliente = deps.cliente();

  const existente = await buscarEnLista(cliente, email, lista);
  if (existente === "error") return rechazo(502, "storage_failed");
  // Already on this list: do not resend, do not deliver an NBI gift, do not
  // reset a confirmed row to pending. The redirect matches a new signup.
  if (existente?.status === "confirmed") return suscrito();

  const fila = {
    email,
    list: lista,
    status: "pending" as const,
    confirm_token_hash: hashToken(token),
    confirm_expires_at: new Date(ahora.getTime() + VENTANA_MS).toISOString(),
    consent_ip: ipDeConsentimiento(ip),
    consent_at: ahora.toISOString(),
    source: "kataivanovych.com",
    locale: siteConfig.locale,
  };

  const { error } = await cliente.from("subscribers").upsert(fila, { onConflict: "email,list" });
  if (error) {
    console.error("[alta] upsert failed:", error.message);
    return rechazo(502, "storage_failed");
  }

  const confirmUrl = `${siteConfig.url}/api/confirm?token=${encodeURIComponent(token)}`;
  const mensaje = mensajeConfirmacionBlog(confirmUrl);
  const fallo = await deps.enviar({ ...mensaje, to: email });
  if (fallo) {
    console.error("[alta] send failed");
    return rechazo(502, "email_failed");
  }

  return suscrito();
}
