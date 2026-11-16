import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { fechaConZona, videoObjectJsonLd } from '@/lib/jsonld';
import { urlsDeVideoYoutube } from '@/lib/youtube';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('VideoYouTube y VideoObject', () => {
  test('embedUrl y contentUrl salen solo del id', () => {
    assert.deepEqual(urlsDeVideoYoutube('AbC_12-xyz'), {
      embedUrl: 'https://www.youtube-nocookie.com/embed/AbC_12-xyz',
      contentUrl: 'https://www.youtube.com/watch?v=AbC_12-xyz',
    });
  });

  test('el JSON-LD lleva los campos obligatorios y no inventa duration ni transcript', () => {
    const urls = urlsDeVideoYoutube('AbC_12-xyz');
    const data = videoObjectJsonLd({
      name: 'Título del vídeo',
      description: 'Qué enseña.',
      thumbnailUrl: 'https://i.ytimg.com/vi/AbC_12-xyz/maxresdefault.jpg',
      uploadDate: '2026-11-19',
      ...urls,
    });
    assert.equal(data['@type'], 'VideoObject');
    assert.equal(data.name, 'Título del vídeo');
    assert.equal(data.description, 'Qué enseña.');
    assert.equal(data.thumbnailUrl, 'https://i.ytimg.com/vi/AbC_12-xyz/maxresdefault.jpg');
    assert.equal(data.uploadDate, fechaConZona('2026-11-19'));
    assert.equal(data.embedUrl, urls.embedUrl);
    assert.equal(data.contentUrl, urls.contentUrl);
    assert.equal('duration' in data, false);
    assert.equal('transcript' in data, false);
  });

  test('duration y transcript solo aparecen si el autor los pasa', () => {
    const data = videoObjectJsonLd({
      name: 'Título',
      description: 'Descripción',
      thumbnailUrl: 'https://i.ytimg.com/vi/AbC_12-xyz/hqdefault.jpg',
      uploadDate: '2026-11-19',
      ...urlsDeVideoYoutube('AbC_12-xyz'),
      duration: 'PT12M30S',
      transcript: 'Transcripción del autor.',
    });
    assert.equal(data.duration, 'PT12M30S');
    assert.equal(data.transcript, 'Transcripción del autor.');
  });

  test('el embed automático por youtubeId no emite VideoObject', () => {
    const auto = readFileSync(join(root, 'src/components/mdx/widgets/youtube-embed.tsx'), 'utf8');
    const pagina = readFileSync(join(root, 'src/app/blog/[slug]/page.tsx'), 'utf8');
    assert.doesNotMatch(auto, /videoObjectJsonLd|VideoObject|VideoYouTube/);
    assert.match(pagina, /YouTubeEmbed/);
    assert.doesNotMatch(pagina, /VideoYouTube|videoObjectJsonLd/);
  });

  test('el componente está registrado en los widgets MDX y no se usa en ningún post', () => {
    const widgets = readFileSync(join(root, 'src/components/mdx/widgets/index.ts'), 'utf8');
    assert.match(widgets, /VideoYouTube/);
    // A new post must not ship with an invented video.
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(mdx?|md)$/.test(name) && readFileSync(path, 'utf8').includes('VideoYouTube')) {
          hits.push(path);
        }
      }
    };
    walk(join(root, 'content'));
    assert.deepEqual(hits, []);
  });
});
