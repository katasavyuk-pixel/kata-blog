/**
 * What /noticias shows, decided from the published posts alone.
 *
 * Pure on purpose (no `#site/content`, no fs): the cover rules are the part of
 * this feature that can silently lie, so they are testable with plain objects.
 *
 * Rules:
 * - the protagonist is the newest lead article (`protagonista`); an edition is
 *   the brief roundup (`noticias-AAAA-MM-DD`);
 * - when the newest edition is more recent than the newest lead article, today
 *   had no sufficient source: the page keeps the last full article, says so,
 *   and shows its real date instead of pretending it is today's;
 * - everything that is not the lead or the newest edition is archive, folded.
 */

export interface PortadaPost {
  slug: string;
  permalink: string;
  title: string;
  description: string;
  dek?: string;
  date: string;
  updated?: string;
  protagonista?: boolean;
}

export interface Portada<T extends PortadaPost> {
  /** Newest lead article, or null before the first one is published. */
  lead: T | null;
  /** Newest brief edition: source of the "novedades". */
  latestEdition: T | null;
  /** True when the lead article is not older than the newest edition. */
  leadIsCurrent: boolean;
  /** Real date of the last edit of anything on this page (ISO), or null. */
  lastEditedAt: string | null;
  /** Everything else, newest first: shown folded. */
  archive: T[];
}

const time = (value: string) => Date.parse(value);
const editedAt = (post: PortadaPost) => post.updated ?? post.date;
const newestFirst = (a: PortadaPost, b: PortadaPost) => time(b.date) - time(a.date);

export function isLeadArticle(post: Pick<PortadaPost, "protagonista">): boolean {
  return post.protagonista === true;
}

export function buildPortada<T extends PortadaPost>(posts: T[]): Portada<T> {
  const articles = posts.filter(isLeadArticle).sort(newestFirst);
  const editions = posts.filter((post) => !isLeadArticle(post)).sort(newestFirst);
  const lead = articles[0] ?? null;
  const latestEdition = editions[0] ?? null;

  const leadIsCurrent = lead !== null && (latestEdition === null || time(lead.date) >= time(latestEdition.date));
  const shown = new Set([lead?.slug, latestEdition?.slug]);
  const archive = posts.filter((post) => !shown.has(post.slug)).sort(newestFirst);

  const edits = [lead, latestEdition].filter((p): p is T => p !== null).map(editedAt);
  const lastEditedAt = edits.length > 0 ? edits.reduce((a, b) => (time(a) >= time(b) ? a : b)) : null;

  return { lead, latestEdition, leadIsCurrent, lastEditedAt, archive };
}
