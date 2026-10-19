import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import {
  PANEL_COOKIE,
  PANEL_COOKIE_OPTIONS,
  isPanelConfigured,
  issueSession,
  verifyPassword,
} from "@/lib/panel-auth";

export const runtime = "nodejs";

/**
 * Password POST for the funnel panel. Accepts a form submission so the login
 * page needs no JavaScript.
 *
 * Rate limited with the same in-memory limiter as the public endpoints (5/60s
 * per IP). That limiter resets per lambda instance, which is a weak guarantee —
 * acceptable here only because the secret is long and random, not a passphrase.
 */
export async function POST(request: NextRequest) {
  if (!isPanelConfigured()) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PANEL_SECRET no configurado" },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`panel:${ip}`)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const password = form?.get("password");

  if (typeof password !== "string" || !verifyPassword(password)) {
    return NextResponse.redirect(new URL("/panel?error=1", request.url));
  }

  const session = issueSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "no configurado" }, { status: 503 });
  }

  const res = NextResponse.redirect(new URL("/panel", request.url));
  res.cookies.set(PANEL_COOKIE, session, PANEL_COOKIE_OPTIONS);
  return res;
}
