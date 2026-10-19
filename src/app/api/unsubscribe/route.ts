import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { cancelWelcomeSequence } from "@/lib/welcome-sequence";
import { deleteSubmissions } from "@/lib/lead-magnets";

export const runtime = "nodejs";

async function doUnsubscribe(token: string | null): Promise<void> {
  if (!token || !isSupabaseConfigured()) return;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("id, email");
  for (const row of data ?? []) {
    // Cancel any onboarding emails still scheduled in Resend for this subscriber.
    await cancelWelcomeSequence(supabase, row.id);
    // Lead magnet submissions have no FK to subscribers (the submission is
    // written before the subscriber exists), so nothing cascades. Once someone
    // opts out, the calculation we kept in order to email it to them is no
    // longer necessary — and the privacy policy says it goes with the address.
    await deleteSubmissions(supabase, row.email);
  }
}

// One-click (RFC 8058): mail clients POST here and expect a 200 with no confirmation step.
export async function POST(request: NextRequest) {
  await doUnsubscribe(request.nextUrl.searchParams.get("token"));
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  await doUnsubscribe(request.nextUrl.searchParams.get("token"));
  return NextResponse.redirect(new URL("/baja", request.url));
}
