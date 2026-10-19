import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A home/index section heading: a full-width red rule, the heading in the
 * reading face, a line under it, and — only where a real count exists in
 * code — the count in words beside it.
 *
 * 2026-10-14 redesign («V1 · Conclusión primero», light): the short red index
 * bar became the rule across the section, and the count stopped being a big
 * mono numeral. A number with a small label beside it is the dashboard
 * pattern; here it is part of the sentence.
 *
 * `tone="rojo"` is for the one red band of a page: white type on the red
 * surface (4.85:1), the rule turns white.
 */
export function SectionHead({
  id,
  title,
  description,
  count,
  action,
  tone = "default",
  className,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Derived from content, never written by hand. */
  count?: { valor: number; etiqueta: string };
  action?: ReactNode;
  tone?: "default" | "rojo";
  className?: string;
}) {
  const rojo = tone === "rojo";
  return (
    <div className={cn("border-t-[3px] pt-5", rojo ? "border-on-accent" : "border-accent", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3">
        <h2
          id={id}
          className={cn("max-w-[30ch] text-h2-section font-medium", rojo ? "text-on-accent" : "text-fg")}
        >
          {title}
        </h2>
        {count || action ? (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 font-sans text-[0.9375rem]">
            {count ? (
              <p className={cn("font-semibold", rojo ? "text-on-accent" : "text-muted")}>
                {count.valor} {count.etiqueta}
              </p>
            ) : null}
            {action}
          </div>
        ) : null}
      </div>
      {description ? (
        <p
          className={cn(
            "mt-3 max-w-[60ch] text-[1.0625rem] leading-relaxed sm:text-[1.1875rem]",
            rojo ? "text-on-accent" : "text-muted",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
