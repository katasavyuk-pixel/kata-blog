"use client";

import { useState, type ReactNode } from "react";
import { Marco, controlClass } from "@/components/pieza/marco";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * The course widgets' frame. Since phase 4 it is a thin wrapper around the
 * pieces' `Marco` (src/components/pieza/marco.tsx), so a lesson widget and an
 * essay piece share one frame, one icon set and 44px controls. The API is the
 * one the course widgets already use: `math` stays behind a toggle here
 * (pieces show their formula always), `onReset` adds the reset control.
 */
export function WidgetFrame({
  title = "Interactivo",
  caption,
  supuestos,
  math,
  onReset,
  children,
  className,
}: {
  title?: string;
  caption?: ReactNode;
  /** What the piece takes for granted: prices, dates, the corpus. One line. */
  supuestos?: ReactNode;
  math?: ReactNode;
  onReset?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const [showMath, setShowMath] = useState(false);

  const acciones =
    math || onReset ? (
      <>
        {math ? (
          <button
            type="button"
            onClick={() => setShowMath((s) => !s)}
            className={controlClass}
            aria-expanded={showMath}
          >
            {showMath ? "Ocultar" : "Ver"} matemáticas
          </button>
        ) : null}
        {onReset ? (
          <button type="button" onClick={onReset} className={controlClass}>
            <Icon name="reset" />
            Reiniciar
          </button>
        ) : null}
      </>
    ) : undefined;

  return (
    <Marco
      titulo={title}
      acciones={acciones}
      formula={math && showMath ? math : undefined}
      supuestos={supuestos}
      pie={caption}
      className={cn("my-8", className)}
    >
      {children}
    </Marco>
  );
}
