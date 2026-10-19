import Link from "next/link";
import { CIERRE_SALIDAS, salidaDestacada, type SalidaId } from "@/config/cierre";
import { cn } from "@/lib/utils";

/** Contextual next steps; NBI appears only where the article is marked relevant. */
export function CierreEstandar({
  formato,
  incluirNbi = false,
}: {
  formato: string;
  incluirNbi?: boolean;
}) {
  const destacada: SalidaId = incluirNbi
    ? salidaDestacada(formato)
    : formato === "leccion"
      ? "curso"
      : "archivo";
  const salidas = incluirNbi
    ? CIERRE_SALIDAS
    : CIERRE_SALIDAS.map((salida) =>
        salida.id === "trabajo"
          ? {
              id: "archivo" as const,
              kicker: "Seguir leyendo",
              titulo: "Más lecturas",
              descripcion:
                "Guías, reflexiones y casos, con sus números y con lo que falló.",
              href: "/blog",
              accion: "Ver todas las lecturas",
            }
          : salida,
      );

  return (
    <section
      aria-labelledby="cierre"
      className="not-prose mt-14 border-t border-border pt-8 font-sans"
    >
      <h2 id="cierre" className="font-sans text-[0.8125rem] font-semibold text-muted">
        Por dónde seguir
      </h2>
      <ul className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-3">
        {salidas.map((salida) => {
          const activa = salida.id === destacada;
          const externa = /^(mailto:|https?:\/\/)/.test(salida.href);
          const Etiqueta = externa ? "a" : Link;
          return (
            <li
              key={salida.id}
              data-cierre={salida.id}
              className={cn(
                "flex flex-col border-t pt-4",
                activa ? "border-accent" : "border-border",
              )}
            >
              <p className="font-sans text-[0.8125rem] text-muted">
                {salida.kicker}
              </p>
              <p className="mt-2 text-base font-semibold text-fg">{salida.titulo}</p>
              <p className="mt-1.5 flex-1 text-[0.9375rem] leading-relaxed text-muted">
                {salida.descripcion}
              </p>
              <Etiqueta
                href={salida.href}
                className="mt-4 text-[0.9375rem] text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
              >
                {salida.accion}
              </Etiqueta>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
