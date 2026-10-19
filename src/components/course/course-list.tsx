"use client";

import { LeccionRow } from "@/components/content/leccion-row";
import { useLocalState } from "@/hooks/use-local-state";
import { COURSE_PROGRESS_KEY } from "@/config/course";

export type CourseItem = {
  slug: string;
  title: string;
  description: string;
  permalink: string;
};

type Progress = Record<string, boolean>;

/**
 * The course itinerary with per-lesson completion state (localStorage via
 * useLocalState — SSR-safe, synced with the marker on each post page).
 * Progress is a count and a bar, as before; the rows are `LeccionRow`.
 */
export function CourseList({ items }: { items: CourseItem[] }) {
  const [progress] = useLocalState<Progress>(COURSE_PROGRESS_KEY, {});
  const done = items.filter((item) => progress[item.slug]).length;
  const next = items.find((item) => !progress[item.slug]);

  return (
    <div className="font-sans">
      <div className="flex items-center gap-4">
        <div
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-label="Progreso del curso"
          className="h-1 flex-1 overflow-hidden bg-surface"
        >
          <div
            className="h-full bg-accent transition-all duration-500 motion-reduce:transition-none"
            style={{ width: `${(done / items.length) * 100}%` }}
          />
        </div>
        <span className="font-sans text-[0.8125rem] text-muted">
          {done}/{items.length} completadas
        </span>
      </div>

      <ol className="mt-6 border-t border-border">
        {items.map((item, i) => (
          <LeccionRow
            key={item.slug}
            index={i + 1}
            title={item.title}
            description={item.description}
            href={item.permalink}
            done={Boolean(progress[item.slug])}
            next={next?.slug === item.slug}
          />
        ))}
      </ol>
    </div>
  );
}
