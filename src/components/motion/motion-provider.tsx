"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Wraps the app so every Motion animation honors the user's reduced-motion
 * preference (`reducedMotion="user"` disables transform/layout animations while
 * keeping opacity). Thin client island; children stay server-rendered.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
