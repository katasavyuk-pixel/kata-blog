import { newsletters } from "#site/content";

export type { NewsletterIssue } from "#site/content";

/**
 * The public web archive of the newsletter: issues that have actually been
 * broadcast (`sent: true`), newest first.
 *
 * Kept in its own module — not `src/lib/newsletter.tsx` — for the same reason
 * `posts.ts` stands apart from the send machinery: a page should be able to
 * import the archive without dragging the Resend SDK and the Supabase admin
 * client into the render path. Gating is enforced here at the source, so no
 * surface can list an unsent issue by accident:
 *
 * - `sent` (not `draft`) is the gate. An approved issue (`draft: false`) that
 *   has not gone out yet must stay private — subscribers are promised the
 *   edition before anybody else, and that promise is cheap to keep: flip
 *   `sent: true` in the same session as the send.
 */
export const sentIssues = [...newsletters]
  .filter((issue) => issue.sent)
  .sort((a, b) => +new Date(b.date) - +new Date(a.date));

export function getIssue(slug: string) {
  return sentIssues.find((issue) => issue.slug === slug);
}
