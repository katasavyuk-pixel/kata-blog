import { sendIssue } from "@/lib/newsletter";
import { handlePanelNewsletterSend } from "@/lib/panel-newsletter-route";

export const runtime = "nodejs";

/** Operate the newsletter from the authenticated panel; production secrets stay server-side. */
export async function POST(request: Request) {
  return handlePanelNewsletterSend(request, sendIssue);
}
