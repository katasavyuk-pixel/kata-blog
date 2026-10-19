import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectCursorPages } from '@/lib/cursor-pages';

type Row = { id: string };

test('collects full pages and the final partial page', async () => {
  const calls: (string | undefined)[] = [];
  const pages: Record<string, Row[]> = {
    start: [{ id: 'a' }, { id: 'b' }],
    b: [{ id: 'c' }, { id: 'd' }],
    d: [{ id: 'e' }],
  };

  const rows = await collectCursorPages(2, async (afterId) => {
    calls.push(afterId);
    return pages[afterId ?? 'start'] ?? [];
  });

  assert.deepEqual(rows.map((row) => row.id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(calls, [undefined, 'b', 'd']);
});

test('detects a repeated cursor instead of looping forever', async () => {
  await assert.rejects(
    collectCursorPages(1, async () => [{ id: 'same' }]),
    /repeated or omitted an id/,
  );
});

test('rejects invalid page sizes and oversized pages', async () => {
  await assert.rejects(collectCursorPages(0, async () => []), RangeError);
  await assert.rejects(
    collectCursorPages(1, async () => [{ id: 'a' }, { id: 'b' }]),
    /more rows than the requested page size/,
  );
});
