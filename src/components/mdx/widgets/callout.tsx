import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "tip" | "warn";

/**
 * Which drawn icon a callout carries, and its colour. 2026-10-14: the box lost
 * its thick left border and the Unicode glyphs (ℹ ✦ ▲) that stood in for icons
 * — DESIGN.md rule 3 says an icon is drawn, never a character.
 */
const styles: Record<CalloutType, { icon: "dot" | "check" | "alert"; color: string }> = {
  info: { icon: "dot", color: "text-accent-ink" },
  tip: { icon: "check", color: "text-accent-ink" },
  warn: { icon: "alert", color: "text-danger" },
};

/** Editorial callout box (server component — no interactivity). */
export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}) {
  const s = styles[type];
  return (
    <aside className="not-prose my-8 border border-border bg-surface px-5 py-4">
      {title ? (
        <p className="mb-1.5 flex items-center gap-2 font-sans text-[0.9375rem] font-bold text-fg">
          <Icon name={s.icon} className={cn("shrink-0", s.color)} />
          {title}
        </p>
      ) : null}
      <div className="text-[1.0625rem] leading-relaxed text-fg sm:text-[1.125rem]">{children}</div>
    </aside>
  );
}
