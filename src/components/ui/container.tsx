import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContainerSize = "narrow" | "default" | "wide";

const widths: Record<ContainerSize, string> = {
  narrow: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-6xl", // ~1152px — the wide editorial grid used across the home
};

/**
 * Centered page container with consistent horizontal padding.
 * `size` controls the max-width (Tailwind v4 resolves conflicting `max-w-*`
 * by source order, so width must be a prop, not an overriding className).
 */
export function Container({
  size = "default",
  className,
  children,
}: {
  size?: ContainerSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full px-5 sm:px-8", widths[size], className)}>
      {children}
    </div>
  );
}
