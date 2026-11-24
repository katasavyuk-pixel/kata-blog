import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

test('published content and source do not mention Irun or Irún', () => {
  const files = ['content', 'src'].flatMap((directory) => filesUnder(join(root, directory)));
  const matches = files.flatMap((path) => {
    const text = readFileSync(path, 'utf8');
    return /ir[uú]n/i.test(text) ? [relative(root, path)] : [];
  });
  assert.deepEqual(matches, []);
});
