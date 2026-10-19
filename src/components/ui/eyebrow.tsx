import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EyebrowTone = "light" | "dark";

/**
 * A short label in the interface face, sentence case (2026-10-14: the mono
 * labels belonged to the previous layout). `tone` survives for the call
 * sites: «dark» is the red one.
 */
export function Eyebrow({
  tone = "light",
  className,
  children,
}: {
  tone?: EyebrowTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "font-sans text-[0.8125rem] font-semibold",
        tone === "dark" ? "text-accent-ink" : "text-fg",
        className,
      )}
    >
      {children}
    </p>
  );
}
