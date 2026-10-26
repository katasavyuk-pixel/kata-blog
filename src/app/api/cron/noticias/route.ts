import { dispatchNoticias, isCronCall, NOTICIAS_WORKFLOW } from "@/lib/noticias-dispatch";

export const runtime = "nodejs";

/**
 * Start the daily news workflow on GitHub Actions. Called by Vercel Cron once a
 * day (vercel.json).
 *
 * Why it exists: GitHub's own schedule for that workflow starts hours late. In
 * 19-25 Oct 2026 its first slot, 02:23 UTC, started around 07:30 UTC, so the
 * morning edition reached the site at 08:30-09:40 in Madrid. Vercel Cron is on
 * time, so it triggers the workflow instead of waiting for GitHub's clock.
 *
 * Safe to repeat. The workflow's first job asks whether today's edition is
 * already on main and skips the rest when it is, so this call and GitHub's own
 * slots are attempts at one edition, never two. Those slots stay as the
 * fallback for the day this call fails.
 *
 * Two variables, both created by hand in Vercel (Production):
 *   CRON_SECRET            Vercel sends it as a Bearer token on every cron call.
 *   GITHUB_DISPATCH_TOKEN  Fine-grained token on kata-blog only, with the
 *                          permission «Actions: Read and write».
 * A missing one answers 503, which shows up as a failed run in Vercel's cron log.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  if (!isCronCall(request.headers.get("authorization"), secret)) {
    return Response.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return Response.json({ ok: false, error: "GITHUB_DISPATCH_TOKEN no configurado" }, { status: 503 });
  }

  try {
    const outcome = await dispatchNoticias({ token });
    if (!outcome.ok) {
      console.error(`[cron/noticias] GitHub rechazó el disparo (HTTP ${outcome.status})`);
      return Response.json({ ok: false, error: "github_rechazo", status: outcome.status }, { status: 502 });
    }
  } catch (err) {
    console.error("[cron/noticias] no se pudo llegar a GitHub:", err instanceof Error ? err.name : err);
    return Response.json({ ok: false, error: "github_inalcanzable" }, { status: 502 });
  }

  return Response.json({ ok: true, workflow: NOTICIAS_WORKFLOW });
}
