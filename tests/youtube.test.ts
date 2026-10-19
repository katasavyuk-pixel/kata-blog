import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MOSTRAR_CORTOS, limpiarTitulo, parseLatestYouTubeVideo, parseYouTubeFeed, videosVisibles } from '@/lib/youtube';

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
  <entry>
    <yt:videoId>new_video-1</yt:videoId>
    <title>Nuevo vídeo de prueba</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=new_video-1" />
    <media:group>
      <media:description>Una descripción breve del vídeo.</media:description>
    </media:group>
  </entry>
</feed>`;

describe('feed de YouTube', () => {
  test('extrae el primer vídeo y construye sus destinos', () => {
    assert.deepEqual(parseLatestYouTubeVideo(feed), {
      id: 'new_video-1',
      href: 'https://youtu.be/new_video-1',
      image: 'https://i.ytimg.com/vi/new_video-1/maxresdefault.jpg',
      label: 'Último vídeo',
      title: 'Nuevo vídeo de prueba',
      description: 'Una descripción breve del vídeo.',
    });
  });

  test('rechaza una entrada sin id o título válido', () => {
    assert.equal(
      parseLatestYouTubeVideo('<feed><entry><title>Sin id</title></entry></feed>'),
      null,
    );
    assert.equal(
      parseLatestYouTubeVideo('<feed><entry><yt:videoId>!</yt:videoId></entry></feed>'),
      null,
    );
  });

  test('salta Shorts y elige el siguiente vídeo normal', () => {
    const feedWithShort = feed.replace(
      '</feed>',
      `<entry>
        <yt:videoId>short_video-1</yt:videoId>
        <title>Clip rápido #shorts</title>
        <link rel="alternate" href="https://www.youtube.com/shorts/short_video-1" />
      </entry>
    </feed>`,
    );

    assert.equal(parseLatestYouTubeVideo(feedWithShort)?.id, 'new_video-1');
  });

  test('no rompe la página si el XML llega incompleto', () => {
    assert.equal(parseLatestYouTubeVideo('<feed><entry>'), null);
  });
});

describe('la lista de vídeos del canal', () => {
  const conCorto = feed.replace(
    '</feed>',
    `<entry>
      <yt:videoId>short_video-1</yt:videoId>
      <title>Día 2: “Cuenta Clara”, una aplicación👇  #IA #ConstruyendoEnPúblico</title>
      <published>2026-09-09T21:47:06+00:00</published>
      <link rel="alternate" href="https://www.youtube.com/shorts/short_video-1" />
    </entry>
  </feed>`,
  );

  test('trae largos y cortos, en el orden del feed, cada uno marcado', () => {
    const videos = parseYouTubeFeed(conCorto);
    assert.deepEqual(videos.map((v) => [v.id, v.short]), [['new_video-1', false], ['short_video-1', true]]);
    assert.equal(videos[1].href, 'https://www.youtube.com/shorts/short_video-1');
    assert.equal(videos[0].href, 'https://www.youtube.com/watch?v=new_video-1');
    assert.equal(videos[1].published, '2026-09-09T21:47:06+00:00');
  });

  test('el título pierde los hashtags y los emojis, no las comillas ni los acentos', () => {
    assert.equal(limpiarTitulo('Día 2: “Cuenta Clara”, una aplicación👇  #IA #ConstruyendoEnPúblico'), 'Día 2: “Cuenta Clara”, una aplicación');
    assert.equal(limpiarTitulo('El problema no es tu TMS ‼️ #automatización #transporte'), 'El problema no es tu TMS');
  });

  test('un XML roto da una lista vacía, no una excepción', () => {
    assert.deepEqual(parseYouTubeFeed('<feed><entry>'), []);
  });
});

describe('los vídeos verticales', () => {
  test('no salen en el sitio mientras Kata no los quiera (15-oct)', () => {
    const conCorto = feed.replace(
      '</feed>',
      `<entry><yt:videoId>short_video-1</yt:videoId><title>Corto</title><link rel="alternate" href="https://www.youtube.com/shorts/short_video-1" /></entry></feed>`,
    );
    const visibles = videosVisibles(parseYouTubeFeed(conCorto));
    assert.equal(MOSTRAR_CORTOS, false);
    assert.deepEqual(visibles.map((v) => v.id), ['new_video-1']);
  });
});
