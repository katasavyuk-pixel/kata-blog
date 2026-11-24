import type { Resource } from "@/lib/resources";

export type PostConRecurso = {
  recurso?: string;
  date: string;
};

type PostConCopy = PostConRecurso & {
  title: string;
  description: string;
  dek?: string;
  cta_inline?: { gancho: string; promesa: string };
};

/** Derive one resource per slug from published posts, newest declaration first. */
export function recursosDePosts<T extends PostConCopy>(posts: readonly T[]): Resource[] {
  const latest = new Map<string, T>();
  for (const post of posts) {
    if (!post.recurso) continue;
    const current = latest.get(post.recurso);
    if (!current || Date.parse(post.date) > Date.parse(current.date)) latest.set(post.recurso, post);
  }
  return [...latest.entries()]
    .sort(([, a], [, b]) => Date.parse(b.date) - Date.parse(a.date))
    .map(([slug, post]) => ({
      id: slug,
      slug,
      title: post.cta_inline?.gancho ?? post.title,
      description: post.cta_inline?.promesa ?? post.dek ?? post.description,
      requires_email: true,
      download_count: 0,
    }));
}

/** Return the newest published post that declares this resource slug. */
export function postDeRecurso<T extends PostConRecurso>(recurso: string, posts: readonly T[]): T | undefined {
  return posts
    .filter((post) => post.recurso === recurso)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
}
