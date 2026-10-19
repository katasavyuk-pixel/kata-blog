import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Long-form reading wrapper for MDX posts. The measure (66ch), the face
 * (Newsreader), the scale and the colours live in globals.css under `.prose`,
 * next to the breakout rule for interactive pieces — one place, so an
 * article and a newsletter edition read the same.
 */
export function Prose({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("prose", className)}>{children}</div>;
}
