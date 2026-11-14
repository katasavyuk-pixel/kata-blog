import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalBlogUrl, hostToRedirect } from '@/lib/host-redirect';

describe('la redirección del host blog.ianexora.com', () => {
  test('solo redirige ese host y www.blog, no el canónico ni otros', () => {
    assert.equal(hostToRedirect('blog.ianexora.com'), 'kata.ianexora.com');
    assert.equal(hostToRedirect('BLOG.ianexora.com:443'), 'kata.ianexora.com');
    assert.equal(hostToRedirect('www.blog.ianexora.com'), 'kata.ianexora.com');
    assert.equal(hostToRedirect('kata.ianexora.com'), null);
    assert.equal(hostToRedirect('ianexora.com'), null);
    assert.equal(hostToRedirect('localhost'), null);
    assert.equal(hostToRedirect(null), null);
    assert.equal(hostToRedirect('  '), null);
  });

  test('conserva la ruta, la query y el hash, y pasa a https', () => {
    assert.equal(
      canonicalBlogUrl(
        'http://blog.ianexora.com/blog/ejemplo?q=1#seccion',
        'blog.ianexora.com',
      ),
      'https://kata.ianexora.com/blog/ejemplo?q=1#seccion',
    );
    assert.equal(canonicalBlogUrl('https://kata.ianexora.com/blog/ejemplo', 'kata.ianexora.com'), null);
  });
});
