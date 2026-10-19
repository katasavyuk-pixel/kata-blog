import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * Commit to a guess, then look — with the answer in the HTML.
 *
 * Native `<details>`: it opens without JavaScript, the browser's find-in-page
 * opens it, and a crawler reads the content whether or not anyone clicks.
 * The old `GuessReveal` rendered the answer only after a click, so the
 * server HTML never had it. The body stays in the reading typography.
 */
export function Revelar({
  pregunta,
  boton = "Ver la respuesta",
  children,
}: {
  pregunta: ReactNode;
  boton?: string;
  children: ReactNode;
}) {
  return (
    <details className="revelar group my-8 border border-border">
      <summary className="not-prose flex min-h-11 cursor-pointer list-none flex-col gap-3 px-4 py-4 font-sans transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-ring)] sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="text-[1rem] leading-relaxed text-fg">{pregunta}</span>
        <span className="inline-flex items-center gap-2 self-start text-[0.875rem] font-semibold text-accent-ink">
          <Icon
            name="chevron-down"
            className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          />
          <span className="group-open:hidden">{boton}</span>
          <span className="hidden group-open:inline">Ocultar</span>
        </span>
      </summary>
      <div className="border-t border-border px-4 pb-2 sm:px-5">{children}</div>
    </details>
  );
}
