/**
 * The last day the visible content of each hand-written page changed (YYYY-MM-DD).
 *
 * It is that page's `lastmod` in the sitemap. A build cannot know when someone
 * edited a page by hand, and the build instant (what these routes carried until
 * 17-oct-2026) tells a crawler that 18 pages changed on every deploy — the
 * field stops meaning anything. So the date is written here, by hand, when what
 * the page says changes. Not on deploys, not on refactors.
 *
 * Seeded on 17-oct-2026 with the date of the last commit that touched each page.
 */
export const REVISADO = {
  "/herramientas": "2026-10-16",
  "/videos": "2026-10-15",
  "/sobre-mi": "2026-10-16",
  "/trabaja-con-nbi": "2026-10-11",
  "/herramientas/no-me-da-la-vida": "2026-10-14",
  "/herramientas/ficha-para-tu-ia": "2026-10-16",
  "/privacidad": "2026-10-13",
  "/cookies": "2026-10-15",
} as const satisfies Record<string, string>;
