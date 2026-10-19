import type { ReactNode } from "react";
import { etiquetaDeEje } from "@/config/taxonomy";
import { formatDate } from "@/lib/format";

/**
 * One news item inside an edition (server component).
 *
 * `title`, `source`, `url`, `date` and `axis` come from the RSS collector and
 * are verified against it before anything is published. `titular` is the
 * edition's own headline in Spanish: when there is one it is what the reader
 * reads first, and the source's headline stays underneath, as written, because
 * that is the one that was checked. The children hold the analysis.
 */
export function RadarItem({
  title,
  titular,
  source,
  url,
  date,
  axis,
  children,
}: {
  title: string;
  titular?: string;
  source: string;
  url: string;
  date: string;
  /** A key of RADAR_AXIS_KEYS; older editions carry other values, shown as written. */
  axis: string;
  children: ReactNode;
}) {
  // 2026-10-14 redesign: an item reads like the article it sits in — no card,
  // the headline in the reading face, the analysis at reading size — and the
  // source's own headline and link stay under it, as they were verified.
  return (
    <article className="not-prose border-t border-border py-7 first-of-type:mt-6">
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-sans text-[0.8125rem] text-muted">
        <span className="font-semibold text-accent-ink">{etiquetaDeEje(axis)}</span>
        <time dateTime={date}>{formatDate(date)}</time>
      </p>
      <h3 className="mt-2 font-display text-[clamp(1.375rem,1.1rem+0.6vw,1.6875rem)] font-semibold leading-tight tracking-[-0.008em] text-fg">
        {titular ?? title}
      </h3>
      <div className="mt-3 text-[1.0625rem] leading-relaxed text-fg sm:text-[1.125rem] [&_p]:mt-2.5 first:[&_p]:mt-0">
        {children}
      </div>
      <p className="mt-3 font-sans text-[0.875rem] leading-snug text-muted">
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-ink underline underline-offset-[0.18em]">
          {source}
        </a>
        {titular ? (
          <>
            . Titular original: <q>{title}</q>
          </>
        ) : null}
      </p>
    </article>
  );
}
