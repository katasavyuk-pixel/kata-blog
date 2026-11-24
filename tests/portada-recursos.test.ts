import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { postDeRecurso } from '@/lib/portada-recursos';

describe('postDeRecurso', () => {
  const posts = [
    { slug: 'old', recurso: 'kit', date: '2026-01-01' },
    { slug: 'unrelated', recurso: 'otro', date: '2026-03-01' },
    { slug: 'new', recurso: 'kit', date: '2026-02-01' },
  ];

  test('selects the newest matching published post', () => {
    assert.equal(postDeRecurso('kit', posts)?.slug, 'new');
  });

  test('returns undefined when no published post declares the resource', () => {
    assert.equal(postDeRecurso('missing', posts), undefined);
  });
});
