import { NextResponse } from "next/server";
import { haConfirmadoAlta } from "@/lib/alta-servidor";
import { procesarAltaPersonal } from "@/lib/alta-formulario";
import { rateLimit } from "@/lib/ratelimit";
import { getResend, isEmailConfigured } from "@/lib/email";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether this browser has already confirmed the newsletter. No email, no list. */
export async function GET() {
  const confirmada = await haConfirmadoAlta();
  return NextResponse.json(
    { confirmada },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/**
 * Personal-blog signup. The form on kataivanovych.com posts here.
 * Public URL: https://ianexora.com/blog/api/alta
 */
export async function POST(request: Request) {
  return procesarAltaPersonal(request, {
    limite: rateLimit,
    listo: () => isSupabaseConfigured() && isEmailConfigured(),
    cliente: () => createAdminClient(),
    enviar: async (mensaje) => {
      const { error } = await getResend().emails.send(mensaje);
      return error ? error.message : null;
    },
  });
}
