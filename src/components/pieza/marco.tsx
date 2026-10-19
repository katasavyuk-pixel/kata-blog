import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * The frame every interactive piece sits in — shared by `Pieza` and by the
 * course's `WidgetFrame`, which is now a thin client wrapper around this.
 *
 * No hooks, so it renders identically on the server and in either parent.
 * The order is fixed and is the reading order: title bar → the piece →
 * how it is calculated (`formula`, always visible: the maths is content, not
 * a toggle) → what it assumes (`supuestos`) → caption.
 *
 * A white panel on the paper page, like the home's doors: it says «this one
 * you can touch». Interface in Schibsted Grotesk, mono only for the data and
 * code a piece shows, red for controls, amber only for `supuestos` (it is the
 * «atención» line). `widget-frame` is the class globals.css lets break out of
 * the 66ch column; `not-prose` keeps article typography out.
 */
export const controlClass =
  "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border border-border bg-panel px-3 font-sans text-[0.8125rem] text-fg transition-colors duration-200 hover:border-accent-ink hover:text-accent-ink active:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-50";

export function Marco({
  titulo,
  acciones,
  formula,
  supuestos,
  pie,
  children,
  className,
  etiqueta,
}: {
  titulo: string;
  /** Controls on the right of the title bar (reset, toggles). */
  acciones?: ReactNode;
  /** How the result is computed. Always visible. */
  formula?: ReactNode;
  supuestos?: ReactNode;
  pie?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Accessible name for the figure when the title alone is not enough. */
  etiqueta?: string;
}) {
  return (
    <figure
      aria-label={etiqueta ?? titulo}
      className={cn(
        "widget-frame pieza not-prose relative border border-border bg-panel font-sans",
        className,
      )}
    >
      {/* Wraps on a phone: a title and two controls do not fit in 335px. */}
      <header className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border py-1 pl-4 pr-1.5">
        <span className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg">
          <Icon name="play" className="text-[0.75em] text-accent-ink" />
          {titulo}
        </span>
        {acciones ? <div className="ml-auto flex items-center gap-1">{acciones}</div> : null}
      </header>

      <div className="p-4 sm:p-6">{children}</div>

      {formula ? (
        <div className="border-t border-border bg-surface px-4 py-3 sm:px-6">
          <p className="text-[0.8125rem] font-semibold text-muted">Cómo se calcula</p>
          <div className="mt-1.5 text-[0.875rem] leading-relaxed text-fg">{formula}</div>
        </div>
      ) : null}

      {supuestos ? (
        <p className="border-t border-border px-4 py-3 text-[0.8125rem] leading-relaxed text-muted sm:px-6">
          <span className="mr-1.5 inline-flex items-center gap-1.5 font-semibold text-amber">
            <Icon name="half" />
            Supuestos
          </span>
          {supuestos}
        </p>
      ) : null}

      {pie ? (
        <figcaption className="border-t border-border px-4 py-3 text-[0.8125rem] leading-relaxed text-muted sm:px-6">
          {pie}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** «Ejemplo» / «Tus datos» tag: the label every default value carries. */
export function EtiquetaEstado({ ejemplo, className }: { ejemplo: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.8125rem] font-medium",
        ejemplo ? "border-border bg-surface text-chrome" : "border-accent-ink/50 text-accent-ink",
        className,
      )}
    >
      {ejemplo ? "Ejemplo" : "Tus datos"}
    </span>
  );
}

/** The one-liner shown when a piece needs JavaScript to respond. */
export function SinJs({ children }: { children: ReactNode }) {
  return (
    <noscript>
      <p className="mt-4 border-t border-border pt-3 text-[0.8125rem] leading-relaxed text-muted">{children}</p>
    </noscript>
  );
}
