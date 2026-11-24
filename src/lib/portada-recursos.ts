export type PostConRecurso = {
  recurso?: string;
  date: string;
};

/** Return the newest published post that declares this resource slug. */
export function postDeRecurso<T extends PostConRecurso>(recurso: string, posts: readonly T[]): T | undefined {
  return posts
    .filter((post) => post.recurso === recurso)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
}
