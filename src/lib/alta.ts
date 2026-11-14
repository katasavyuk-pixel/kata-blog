/**
 * Whether the reader has confirmed the newsletter (double opt-in).
 *
 * The `nbi_subscriber` cookie is set by /api/confirm, httpOnly, for 30 days.
 * It already existed so a just-confirmed visitor could download the gift.
 * This helper only asks whether the cookie is present: it never reads the
 * address into a page.
 *
 * When Supabase is not configured (local, or a preview without the backend),
 * the gate stays open so the install commands remain visible. Hiding them
 * behind a form that cannot confirm would be a dead end.
 */
export function altaConfirmada({
  supabaseConfigurado,
  cookie,
}: {
  supabaseConfigurado: boolean;
  cookie: string | undefined;
}): boolean {
  if (!supabaseConfigurado) return true;
  return Boolean(cookie?.trim());
}
