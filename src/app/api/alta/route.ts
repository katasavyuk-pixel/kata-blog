import { NextResponse } from "next/server";
import { haConfirmadoAlta } from "@/lib/alta-servidor";

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
