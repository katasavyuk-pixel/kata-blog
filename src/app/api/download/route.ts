import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { verifyDownloadSignature } from "@/lib/signed-links";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const supabase = createAdminClient();
  const { data: resource } = await supabase
    .from("resources")
    .select("id, file_path, requires_email")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!resource) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (resource.requires_email) {
    // Two ways in, one authorisation check.
    //
    // A signature in the URL is what makes the button in an email work: the
    // cookie is bound to the browser that clicked the confirmation link, which
    // is routinely not the one opening the mail. Whichever path identifies the
    // reader, the status is still read live from the database, so a link held
    // by someone who has since unsubscribed stops working.
    const params = request.nextUrl.searchParams;
    const signedEmail = params.get("e");
    const email = verifyDownloadSignature(
      slug,
      signedEmail ?? "",
      params.get("exp"),
      params.get("sig"),
    )
      ? signedEmail
      : (await cookies()).get("nbi_subscriber")?.value;

    let confirmed = false;
    if (email) {
      const { data: sub } = await supabase
        .from("subscribers")
        .select("status")
        .eq("email", email)
        .maybeSingle();
      confirmed = sub?.status === "confirmed";
    }
    if (!confirmed) {
      return NextResponse.redirect(
        new URL(`/herramientas?need_email=${encodeURIComponent(slug)}`, request.url),
      );
    }
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("lead-magnets")
    .createSignedUrl(resource.file_path, 300, { download: true });

  // A published row whose file_path points at nothing — the failure
  // supabase/seeds/resources.sql warns about at the top, and the worst possible
  // moment for it: the reader has just handed over their address and confirmed
  // it. A raw 500 JSON body tells them nothing and tells us nothing either.
  //
  // Bounce to the page that already knows how to explain itself, and log loudly
  // enough that the cause is the first thing in the runtime logs.
  if (!signed?.signedUrl) {
    console.error(
      `[download] no object at "${resource.file_path}" for slug "${slug}" — ` +
        `the row is published but Storage has nothing to sign.`,
      signError,
    );
    return NextResponse.redirect(
      new URL(`/herramientas?error=descarga&slug=${encodeURIComponent(slug)}`, request.url),
    );
  }

  await supabase.rpc("increment_download_count", { p_id: resource.id });
  return NextResponse.redirect(signed.signedUrl);
}
