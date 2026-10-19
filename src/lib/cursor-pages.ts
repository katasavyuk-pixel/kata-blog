/** Collect every stable keyset page without relying on a backend's default row cap. */
export async function collectCursorPages<T extends { id: string }>(
  pageSize: number,
  fetchPage: (afterId?: string) => Promise<readonly T[]>,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive integer");
  }

  const result: T[] = [];
  const seen = new Set<string>();
  let afterId: string | undefined;

  while (true) {
    const page = await fetchPage(afterId);
    if (page.length > pageSize) {
      throw new Error("fetchPage returned more rows than the requested page size");
    }
    if (page.length === 0) return result;

    for (const row of page) {
      if (!row.id || seen.has(row.id)) {
        throw new Error("cursor page repeated or omitted an id");
      }
      seen.add(row.id);
      result.push(row);
    }

    const nextAfterId = page.at(-1)?.id;
    if (!nextAfterId || nextAfterId === afterId) {
      throw new Error("cursor did not advance");
    }
    if (page.length < pageSize) return result;
    afterId = nextAfterId;
  }
}
