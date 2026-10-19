import { cn } from "@/lib/utils";
import { YouTubeFacade } from "@/components/video/youtube-facade";

/**
 * Privacy-enhanced embed (youtube-nocookie.com) for a post's companion episode,
 * behind a facade: the player loads when the reader presses play, not with the
 * page.
 *
 * `entregaAqui` when the article hands over its own resource (frontmatter
 * `recurso`). The caption used to point at /recursos unconditionally, which on
 * such an article sends the reader away to give the same address to the same
 * list a second time — the duplication this whole change exists to remove.
 */
export function YouTubeEmbed({
  id,
  title,
  className,
  entregaAqui = false,
}: {
  id: string;
  title: string;
  className?: string;
  entregaAqui?: boolean;
}) {
  return (
    <figure
      className={cn(
        "not-prose my-8 overflow-hidden border border-border bg-bg shadow-card",
        className,
      )}
    >
      <YouTubeFacade id={id} title={title} sizes="(min-width: 768px) 66ch, 100vw" />
      <figcaption className="border-t border-border px-4 py-2.5 text-xs leading-relaxed text-muted">
        {entregaAqui ? (
          <>Vídeo del episodio — la explicación y el recurso descargable están más abajo, en este mismo artículo.</>
        ) : (
          <>
            Vídeo del episodio — el código está más abajo, en{" "}
            <a href="/herramientas" className="text-accent-ink hover:underline">
              /herramientas
            </a>
            .
          </>
        )}
      </figcaption>
    </figure>
  );
}
