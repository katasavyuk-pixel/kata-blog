"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A YouTube video that costs nothing until the reader asks for it: a thumbnail
 * and a play button, and only on click the youtube-nocookie player. Until that
 * click no request reaches YouTube, which is what /cookies promises. Vertical
 * for a Short, so its frame fills the box instead of sitting between bars.
 */
export function YouTubeFacade({
  id,
  title,
  vertical = false,
  sizes,
  className,
}: {
  id: string;
  title: string;
  vertical?: boolean;
  /** The `sizes` of the thumbnail: how wide the box is at each breakpoint. */
  sizes: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-fg", vertical ? "aspect-[9/16]" : "aspect-video", className)}>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 block h-full w-full cursor-pointer"
        >
          <span className="sr-only">Ver el vídeo: {title}</span>
          <Image
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
          />
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-accent text-on-accent transition-colors group-hover:bg-accent-strong"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
