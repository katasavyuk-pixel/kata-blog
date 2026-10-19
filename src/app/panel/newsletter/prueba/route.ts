import { sendTestIssue } from "@/lib/newsletter";
import { handlePanelNewsletterTest } from "@/lib/panel-newsletter-route";

export const runtime = "nodejs";

/** «Mandarme una prueba»: one copy of an edition to RESEND_REPLY_TO, from the authenticated panel. */
export async function POST(request: Request) {
  return handlePanelNewsletterTest(request, sendTestIssue);
}
