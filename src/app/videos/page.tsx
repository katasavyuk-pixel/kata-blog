import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd, datosDe } from "@/lib/jsonld";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHead } from "@/components/ui/section-head";
import { YouTubeFacade } from "@/components/video/youtube-facade";
import { feedAlternates, withOpenGraph } from "@/config/site";
import { formatDateShort } from "@/lib/format";
import { allPosts } from "@/lib/posts";
import { YOUTUBE_CHANNEL_URL, getYouTubeVideos, type YouTubeVideo } from "@/lib/youtube";

// Same refresh as the feed read: a new upload shows here within 15 minutes.
export const revalidate = 900;

export const metadata: Metadata = withOpenGraph("/videos", {
  title: "Vídeos",
  description:
    "Los vídeos de mi canal de YouTube: sistemas de IA montados en un negocio de verdad, de principio a fin, con su artículo cuando lo tienen.",
  alternates: { ...feedAlternates, canonical: "/videos" },
});

const enlace = "font-semibold text-accent-ink underline underline-offset-[0.18em] hover:decoration-2";

/** The article that goes with a video, when there is one (frontmatter `youtubeId`). */
function articuloDe(video: YouTubeVideo) {
  return allPosts.find((post) => post.youtubeId === video.id);
}

/**
 * The channel's episodes, read from its public feed (src/lib/youtube.ts), each
 * with its article when it has one. Shorts only appear while `MOSTRAR_CORTOS`
 * is on (off since 2026-10-15). Nothing here is typed by hand, so a new video
 * needs no deploy.
 */
export default async function VideosPage() {
  const videos = await getYouTubeVideos();
  const largos = videos.filter((video) => !video.short);
  const cortos = videos.filter((video) => video.short);

  return (
    <Container size="wide" className="py-10 sm:py-14">
      <JsonLd data={coleccionJsonLd({ path: "/videos", ...datosDe(metadata), items: largos.map((v) => ({ name: v.title, url: v.href })) })} />
      <header className="max-w-[66ch]">
        <h1 className="text-h1 font-medium">Vídeos</h1>
        <p className="mt-4 text-lede text-muted">
          Monto un sistema de IA en un negocio de verdad y lo grabo de principio a fin: qué hace, cómo está montado y
          dónde falló.
        </p>
        <p className="mt-4 font-sans text-[0.9375rem]">
          <a href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className={enlace}>
            Ver el canal en YouTube
          </a>
        </p>
      </header>

      {largos.length > 0 ? (
        <section aria-labelledby="videos-largos" className="mt-12">
          <SectionHead id="videos-largos" title="Episodios" />
          <ul className="mt-8 grid gap-x-8 gap-y-12 md:grid-cols-2">
            {largos.map((video) => {
              const articulo = articuloDe(video);
              return (
                <li key={video.id} id={`video-${video.id}`} className="min-w-0 font-sans">
                  <YouTubeFacade id={video.id} title={video.title} sizes="(min-width: 768px) 50vw, 100vw" />
                  <p className="mt-3 text-[0.8125rem] text-muted">
                    <time dateTime={video.published}>{formatDateShort(video.published)}</time>
                  </p>
                  <h3 className="mt-1 font-display text-[1.375rem] font-medium leading-snug">{video.title}</h3>
                  <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.9375rem]">
                    {articulo ? (
                      <Link href={articulo.permalink} className={enlace}>
                        Léelo con sus números
                      </Link>
                    ) : null}
                    <a href={video.href} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-fg">
                      Ver en YouTube
                    </a>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {cortos.length > 0 ? (
        <section aria-labelledby="videos-cortos" className="mt-16">
          <SectionHead id="videos-cortos" title="Cortos" description="Un minuto, una idea." />
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {cortos.map((video) => (
              <li key={video.id} id={`video-${video.id}`} className="min-w-0 font-sans">
                <YouTubeFacade
                  id={video.id}
                  title={video.title}
                  vertical
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                />
                <p className="mt-2 text-[0.8125rem] text-muted">
                  <time dateTime={video.published}>{formatDateShort(video.published)}</time>
                </p>
                <h3 className="mt-1 text-[0.9375rem] font-semibold leading-snug">{video.title}</h3>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
