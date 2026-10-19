import { GUIAS_NBI, PUENTE_ENTRADA, urlDeGuia, type GuiaNbi } from "@/config/puentes";

/**
 * One line that continues the page in a guide on ianexora.com
 * (src/config/puentes.ts says which guide and why only guides).
 */
export function PuenteNbi({ guia, campana, className = "mt-12" }: { guia: GuiaNbi; campana: string; className?: string }) {
  return (
    <p className={`${className} border-l-2 border-accent pl-4 font-sans text-[0.9375rem] text-muted`}>
      {PUENTE_ENTRADA}{" "}
      <a
        href={urlDeGuia(guia, campana)}
        className="font-semibold text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
      >
        {GUIAS_NBI[guia].titulo}
      </a>
    </p>
  );
}
