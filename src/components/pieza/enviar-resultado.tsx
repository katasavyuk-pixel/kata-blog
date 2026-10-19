"use client";

import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { Icon } from "@/components/ui/icon";
import {
  PIEZAS,
  computeProcesos,
  esPiezaConEmail,
  parseProcesos,
  type EntradaProcesos,
} from "@/lib/piezas/registry";
import { usePieza } from "./pieza";

/**
 * The email offered after a piece, through the one capture path the site has
 * (SubscribeForm → /api/subscribe → double opt-in). The piece's current
 * inputs travel as `payload` under `magnetSlug`; the server parses and
 * recomputes them (src/lib/lead-magnets.ts) and src/lib/piezas/email.ts
 * renders the block.
 *
 * The copy says exactly what arrives, and what arrives is something the page
 * does not show — the rule after the old calculator's email was judged «un
 * peaje, no un intercambio». The result itself is never behind the form.
 *
 * Only for pieces in PIEZAS_CON_EMAIL. Pieces whose email is an existing
 * resource (the PDF, the ZIP) use the article's own `SuscripcionInline`;
 * a second form for the same file would be asking twice.
 */
export function EnviarResultado({ magnet }: { magnet: string }) {
  if (!esPiezaConEmail(magnet)) {
    throw new Error(`<EnviarResultado magnet="${magnet}">: no es una pieza con email en src/lib/piezas/registry.ts.`);
  }
  return <EnviarProcesos magnet={magnet} />;
}

function EnviarProcesos({ magnet }: { magnet: "prioridad-procesos" }) {
  const pieza = usePieza();
  const actual = pieza?.estado?.modelo === magnet ? pieza.estado : null;
  const entrada = (actual?.entrada as EntradaProcesos | undefined) ?? PIEZAS[magnet].ejemplo;
  const esEjemplo = actual ? actual.ejemplo : true;
  const top = computeProcesos(parseProcesos(entrada) ?? PIEZAS[magnet].ejemplo).puestos[0];

  return (
    <section aria-labelledby="enviar-resultado" className="mt-8 border-t border-border pt-6">
      <h3 id="enviar-resultado" className="flex scroll-mt-24 items-center gap-2 text-[1.0625rem] font-semibold text-fg">
        <Icon name="mail" className="text-accent-ink" />
        ¿Te mando el orden y una hoja para medir el primero?
      </h3>
      <p className="mt-2 max-w-[60ch] text-[0.875rem] leading-relaxed text-muted">
        Tu orden por escrito, con tus notas, y una hoja de diez días para medir{" "}
        <span className="text-fg">«{top?.nombre}»</span> antes de construir nada: casos, minutos,
        correcciones e interrupciones, con la cuenta para cerrarla. La hoja no está en esta página.
      </p>
      {esEjemplo ? (
        <p className="mt-2 max-w-[60ch] text-[0.8125rem] leading-relaxed text-amber">
          Ahora mismo te llegaría el ejemplo. Pon tus procesos arriba antes de pedirlo.
        </p>
      ) : null}
      <div className="mt-4 max-w-xl">
        <SubscribeForm
          source={`pieza-${magnet}`}
          magnetSlug={magnet}
          payload={() => ({ ...entrada })}
          submitLabel="Enviármelo"
          layout="inline"
          visibleLabel="Tu correo"
          doneMessage="Hecho. Confirma en tu correo y te llegan el orden y la hoja (doble opt-in)."
          consentLabel={
            <>
              Acepto recibir el orden, la hoja y la newsletter, y la{" "}
              <a href="/privacidad" className="text-accent-ink underline">
                política de privacidad
              </a>
              . Es una sola lista: te mando esto y te quedas suscrito. Te llega un email para
              confirmar, y bajas en un clic desde cualquiera de ellos.
            </>
          }
        />
      </div>
    </section>
  );
}
