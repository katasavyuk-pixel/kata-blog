import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { postDeRecurso, recursosDePosts } from '@/lib/portada-recursos';

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

describe('recursosDePosts', () => {
  const post = (slug: string, date: string, title = slug) => ({
    slug, date, title, description: `${title} description`, recurso: slug,
    cta_inline: { gancho: `${title} hook`, promesa: `${title} promise` },
  });

  test('orders distinct resources by their newest declaring post', () => {
    const resources = recursosDePosts([
      post('kit', '2026-01-01'),
      post('otro', '2026-03-01'),
      post('kit', '2026-02-01'),
    ]);
    assert.deepEqual(resources.map(({ slug }) => slug), ['otro', 'kit']);
    assert.equal(resources[1].title, 'kit hook');
  });

  test('uses title and dek or description when inline copy is missing', () => {
    const resources = recursosDePosts([
      { recurso: 'sin-dek', date: '2026-01-01', title: 'Título', description: 'Descripción' },
      { recurso: 'con-dek', date: '2026-02-01', title: 'Otro', description: 'Descripción larga', dek: 'Bajada' },
    ]);
    assert.deepEqual(resources.map(({ title, description }) => [title, description]), [
      ['Otro', 'Bajada'],
      ['Título', 'Descripción'],
    ]);
  });
});
