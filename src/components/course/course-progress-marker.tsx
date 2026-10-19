"use client";

import { useEffect } from "react";
import { useLocalState } from "@/hooks/use-local-state";
import { COURSE_PROGRESS_KEY } from "@/config/course";

/**
 * Invisible marker mounted on course-lesson post pages: records the lesson
 * as completed in localStorage so /empieza-aqui reflects real progress.
 */
export function CourseProgressMarker({ slug }: { slug: string }) {
  const [, setProgress] = useLocalState<Record<string, boolean>>(
    COURSE_PROGRESS_KEY,
    {},
  );

  useEffect(() => {
    setProgress((prev) => (prev[slug] ? prev : { ...prev, [slug]: true }));
  }, [slug, setProgress]);

  return null;
}
