import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * A simulated email inside a piece. Always labelled «Correo simulado»: the
 * people, companies and references in it are invented, never a client's
 * (no real data on screen).
 */
export function Correo({
  de,
  asunto,
  fecha,
  children,
}: {
  de: string;
  asunto: string;
  fecha?: string;
  children: ReactNode;
}) {
  return (
    <div className="not-prose my-4 border border-border bg-surface font-sans">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <span className="inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-chrome">
          <Icon name="mail" />
          Correo simulado
        </span>
        {fecha ? <span className="text-[0.8125rem] text-muted">{fecha}</span> : null}
      </div>
      <dl className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-border px-4 py-3 text-[0.8125rem]">
        <dt className="text-muted">De</dt>
        <dd className="min-w-0 break-words text-fg">{de}</dd>
        <dt className="text-muted">Asunto</dt>
        <dd className="min-w-0 text-fg">{asunto}</dd>
      </dl>
      <div className="pieza-cuerpo px-4 py-3 font-body text-[0.9375rem] leading-relaxed text-fg">{children}</div>
    </div>
  );
}
