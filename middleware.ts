import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { canonicalBlogUrl } from "@/lib/host-redirect";

export async function middleware(request: NextRequest) {
  const redirected = canonicalBlogUrl(request.url, request.headers.get("host"));
  if (redirected) {
    return NextResponse.redirect(redirected, 301);
  }

  // Before the Supabase project exists (Fase 0), env vars are unset — skip the
  // session refresh so the app runs locally without a live connection.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return NextResponse.next({ request });
  }
  return updateSession(request);
}

export const config = {
  // Run on all paths except static assets and image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
