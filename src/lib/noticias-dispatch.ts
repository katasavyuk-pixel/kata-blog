import { createHash, timingSafeEqual } from "node:crypto";

/** The repository and workflow that write and publish the daily news edition. */
export const NOTICIAS_REPO = "katasavyuk-pixel/kata-blog";
export const NOTICIAS_WORKFLOW = "noticias-diarias.yml";

/**
 * Whether a request is Vercel's own cron call.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when that variable is set
 * on the project. Fails closed: an unset or empty secret authorizes nobody, so
 * a missing variable disables the endpoint instead of opening it. Both sides are
 * hashed first so the comparison is constant-time whatever their lengths.
 */
export function isCronCall(authorization: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(authorization ?? ""), digest(`Bearer ${secret}`));
}

export type DispatchOutcome = { ok: true } | { ok: false; status: number };

/**
 * Ask GitHub to run the daily news workflow on `main`.
 *
 * GitHub answers 204 with no body when it accepted the dispatch; anything else
 * (401 token expired, 403 missing «Actions: write», 404 wrong repo or workflow
 * disabled, 422 no such ref) comes back as its status, never as an exception.
 */
export async function dispatchNoticias({
  token,
  fetchImpl = fetch,
}: {
  token: string;
  fetchImpl?: typeof fetch;
}): Promise<DispatchOutcome> {
  const response = await fetchImpl(
    `https://api.github.com/repos/${NOTICIAS_REPO}/actions/workflows/${NOTICIAS_WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "user-agent": "kata-blog-cron",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );
  return response.status === 204 ? { ok: true } : { ok: false, status: response.status };
}
