import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { scheduleWelcomeSequence } from "@/lib/welcome-sequence";
import { urlPublica } from "@/lib/url-publica";
import { BASE_PATH } from "@/config/base-path";
import { confirmarPorToken } from "@/lib/confirmar-suscriptor";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const resource = request.nextUrl.searchParams.get("resource") ?? undefined;

  if (!token) {
    return NextResponse.redirect(urlPublica("/gracias?error=token"));
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(urlPublica("/gracias?preview=1"));
  }

  const supabase = createAdminClient();
  const resultado = await confirmarPorToken(supabase, {
    token,
    resource,
    // NBI only. Personal lists confirm without a row in `scheduled_emails`.
    programarSecuencia: (sub) => scheduleWelcomeSequence(supabase, sub),
  });

  // Soft, session-less marker so a just-confirmed NBI visitor can download lead
  // magnets. Personal-list confirms do not get it: the cookie is what the
  // marketplace treats as "already subscribed", and that gate is NBI's.
  if (resultado.cookieEmail) {
    (await cookies()).set("nbi_subscriber", resultado.cookieEmail, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      // Only the blog's paths: ianexora.com outside /blog is NBI-WEB, which
      // promises no cookies at all (26-nov-2026 migration).
      path: BASE_PATH,
    });
  }

  return NextResponse.redirect(resultado.location);
}
