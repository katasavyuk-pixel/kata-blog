"use client";

import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import { glossary } from "@/lib/glossary";

/**
 * Hover/focus glossary popover for AI jargon. Accessible by construction
 * (Radix: keyboard-focusable, Esc to dismiss). Serves the mixed audience —
 * non-devs get instant definitions, devs aren't slowed down.
 *
 * The popover closes with a link to the glossary entry — the term is already
 * a signal that the reader wants depth, and the entry page carries the
 * related-article handoff. It is the one internal link on the site every
 * post inherits for free, so it earns its place in the corner.
 */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const entry = glossary[id];
  if (!entry) return <>{children}</>;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="cursor-help font-medium text-accent-ink underline decoration-dotted decoration-from-font underline-offset-4"
        >
          {children}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-xs border border-border bg-bg p-3.5 text-left shadow-card"
        >
          <p className="font-display text-sm font-semibold text-fg">
            {entry.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{entry.def}</p>
          <Link
            href={`/glosario/${id}`}
            className="mt-2 inline-block font-sans text-[0.8125rem] font-semibold text-accent-ink transition-colors hover:text-fg"
          >
            Ver en el glosario
          </Link>
          <Popover.Arrow className="fill-[var(--color-border)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
