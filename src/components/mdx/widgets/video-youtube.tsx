import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/ui/json-ld";
import { videoObjectJsonLd } from "@/lib/jsonld";
import { YouTubeFacade } from "@/components/video/youtube-facade";
import { urlsDeVideoYoutube } from "@/lib/youtube";

/**
 * Embed a YouTube video in an MDX post, with a click-to-load youtube-nocookie
 * facade and a VideoObject JSON-LD block.
 *
 * Required props come from the author. Never invent a title, a date, a
 * thumbnail, a duration or a transcript. `embedUrl` and `contentUrl` are
 * derived from `id`.
 *
 * Usage in a post:
 *
 *   <VideoYouTube
 *     id="XXXXXXXXXXX"
 *     name="Título del vídeo, tal como está en YouTube"
 *     description="Qué enseña el vídeo, en una o dos frases."
 *     thumbnailUrl="https://i.ytimg.com/vi/XXXXXXXXXXX/maxresdefault.jpg"
 *     uploadDate="2026-11-19"
 *   />
 *
 * Optional: `duration` (ISO 8601, e.g. PT12M30S), `transcript`, `caption`.
 * Leave them out rather than guessing. Do not add this component to a post
 * until the video exists and those values are known.
 *
 * The automatic embed from frontmatter `youtubeId` is a different component
 * (`YouTubeEmbed`) and does not emit VideoObject, because that field alone
 * does not carry a description or an upload date.
 */
export function VideoYouTube({
  id,
  name,
  description,
  thumbnailUrl,
  uploadDate,
  duration,
  transcript,
  caption,
  className,
}: {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  transcript?: string;
  caption?: string;
  className?: string;
}) {
  const urls = urlsDeVideoYoutube(id);

  return (
    <figure
      className={cn(
        "not-prose my-8 overflow-hidden border border-border bg-bg shadow-card",
        className,
      )}
    >
      <JsonLd
        data={videoObjectJsonLd({
          name,
          description,
          thumbnailUrl,
          uploadDate,
          ...urls,
          duration,
          transcript,
        })}
      />
      <YouTubeFacade id={id} title={name} sizes="(min-width: 768px) 66ch, 100vw" />
      {caption ? (
        <figcaption className="border-t border-border px-4 py-2.5 text-xs leading-relaxed text-muted">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
