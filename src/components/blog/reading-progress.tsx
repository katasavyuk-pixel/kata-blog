/**
 * Thin reading-progress gauge at the top of the viewport, driven purely by
 * CSS scroll-timeline (zero JS; globals.css `.reading-progress`).
 *
 * Fixed and 2px tall, so it causes no layout shift; `aria-hidden` because the
 * scrollbar already tells assistive tech where the reader is. The article
 * page renders it only for posts with interactive pieces or a reading time of
 * six minutes or more — on a short note it is noise.
 */
export function ReadingProgress() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div className="reading-progress h-full w-full bg-accent" />
    </div>
  );
}
