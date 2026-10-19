import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { hashToken, generateToken } from "@/lib/tokens";
import { scheduleWelcomeSequence } from "@/lib/welcome-sequence";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const resource = request.nextUrl.searchParams.get("resource") ?? undefined;

  if (!token) {
    return NextResponse.redirect(new URL("/gracias?error=token", request.url));
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/gracias?preview=1", request.url));
  }

  const supabase = createAdminClient();
  const { data: sub } = await supabase
    .from("subscribers")
    .select("id, email, status, confirm_expires_at")
    .eq("confirm_token_hash", hashToken(token))
    .maybeSingle();

  if (
    !sub ||
    sub.status === "unsubscribed" ||
    !sub.confirm_expires_at ||
    new Date(sub.confirm_expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.redirect(new URL("/gracias?error=expired", request.url));
  }

  const unsubscribeToken = generateToken();
  const { error: confirmError } = await supabase
    .from("subscribers")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      confirm_token_hash: null,
      confirm_expires_at: null,
      unsubscribe_token: unsubscribeToken,
    })
    .eq("id", sub.id);

  // Checked, because continuing past a failed write is worse than stopping.
  //
  // The update carries the unsubscribe token. If it does not land, the three
  // sequence emails below still go out — each one advertising a
  // List-Unsubscribe token that is in nobody's database. One-click unsubscribe
  // then updates zero rows and reports success, and /baja tells the reader they
  // will get no more email while the sequence keeps arriving. That is an RFC
  // 8058 breach with no signal anywhere, produced by a `.update()` whose result
  // nobody read.
  if (confirmError) {
    console.error("[confirm] update failed:", confirmError);
    return NextResponse.redirect(new URL("/gracias?error=guardado", request.url));
  }

  // Soft, session-less marker so a just-confirmed visitor can download lead magnets
  // (free-with-email gating; real access control for paid content arrives in Fase 3).
  (await cookies()).set("nbi_subscriber", sub.email, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  // Onboarding sequence (now / +48h / +96h) via Resend scheduledAt.
  //
  // The first step is sent immediately from in here, which is why there is no
  // longer a separate "welcome" email: that one went out without a
  // List-Unsubscribe header or a visible unsubscribe link, so the very first
  // email a subscriber received was the only one that broke RFC 8058.
  //
  // Best-effort: skips itself while `scheduled_emails` is missing, and never
  // breaks this redirect.
  await scheduleWelcomeSequence(supabase, {
    id: sub.id,
    email: sub.email,
    unsubscribeToken,
    resource,
  });

  const dest = resource
    ? `/gracias?descarga=${encodeURIComponent(resource)}`
    : "/gracias?confirmed=1";
  return NextResponse.redirect(new URL(dest, request.url));
}
