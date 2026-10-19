import type { Evidencia } from "@/lib/evidence";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * Status of a system as icon + label, never colour alone (DESIGN.md). The
 * icon carries the state for anyone who cannot see the colour; the colour
 * only reinforces it: red for running, amber for the workshop/pilot.
 *
 * Derived from the evidence, like everything else about a system: the
 * previous `status` field could contradict it.
 */
export function Estado({
  evidencia,
  className,
  variant = "inline",
}: {
  evidencia: Evidencia;
  className?: string;
  /** `pill`: the ficha's header — tinted surface, icon, label, date. */
  variant?: "inline" | "pill";
}) {
  const state = stateOf(evidencia);
  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex min-h-8 items-center gap-2 rounded-full px-3 py-1 font-sans text-[0.8125rem] font-semibold",
          state.pill,
          className,
        )}
      >
        <Icon name={state.icon} className={cn("text-[1.15em]", state.tone)} />
        <span className="text-fg">{state.label}</span>
        {state.since ? <span className="text-chrome">· {state.since}</span> : null}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Icon name={state.icon} className={state.tone} />
      <span className="text-fg">{state.label}</span>
      {state.since ? <span className="text-muted">· {state.since}</span> : null}
    </span>
  );
}

function stateOf(evidencia: Evidencia): { icon: IconName; label: string; tone: string; pill: string; since?: string } {
  switch (evidencia.tipo) {
    case "en-produccion":
      return { icon: "dot", label: "en producción", tone: "text-accent-ink", pill: "bg-accent/15", since: `desde ${evidencia.desde}` };
    case "en-taller":
      return { icon: "half", label: "en el taller", tone: "text-amber", pill: "bg-amber/15", since: `previsto ${monthLabel(evidencia.eta)}` };
    case "reproducible":
      return { icon: "play", label: "reproducible", tone: "text-accent-ink", pill: "bg-accent/15" };
    case "medido":
      return { icon: "dot", label: evidencia.dato, tone: "text-accent-ink", pill: "bg-accent/15" };
    case "experiencia":
      return { icon: "ring", label: evidencia.nota, tone: "text-muted", pill: "bg-surface" };
  }
}

/** "2026-12" → "dic 2026" (same short form as formatDateShort, without the day). */
function monthLabel(eta: string): string {
  return new Date(`${eta}-01T00:00:00`).toLocaleDateString("es-ES", { month: "short", year: "numeric" });
}
