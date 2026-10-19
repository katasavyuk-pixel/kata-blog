import { Button } from "@/components/ui/button";
import {
  NBI_DIAGNOSTICO,
  NBI_DIAGNOSTICO_TEXTO,
  nbiDiagnosticoUrl,
} from "@/config/nbi-diagnostico";

/**
 * Commercial next step on /sistemas. Points at the diagnosis NBI offers today,
 * on ianexora.com: no price and no deadline here, because the proposal fixes
 * them. Generic "tell me your case" stays on /trabaja-con-nbi.
 */
export function WorkWithNbiCta() {
  return (
    <div className="mt-10 border-t border-border pt-6 font-sans">
      <p className="font-sans text-[0.8125rem] text-muted">NBI</p>
      <h2 className="mt-2 max-w-[28ch] text-h2">
        ¿Tienes un proceso que se come las horas de tu equipo?
      </h2>
      <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted">
        {NBI_DIAGNOSTICO_TEXTO}
      </p>
      <div className="mt-4">
        <Button href={nbiDiagnosticoUrl("sistemas", "work-with-nbi")} size="sm">
          Ver el {NBI_DIAGNOSTICO.nombre.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}
