"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  CAMPOS_INBOX,
  PIEZAS,
  computeInbox,
  formatoInbox,
  parseInbox,
  type EntradaInbox,
} from "@/lib/piezas/registry";
import { usePieza } from "./pieza";
import { EtiquetaEstado, SinJs, controlClass } from "./marco";
import { useMarcaUso } from "./use-marca-uso";

/**
 * A formula the article already declares, with the reader's numbers in it.
 *
 * Fields come from the model (`campos`), so MDX passes only `modelo`. Each
 * field keeps its own draft text: a reader mid-way through typing «2» on the
 * way to «25» is not an error, and the result keeps the last valid value
 * until the field is valid again. Out-of-range values say so next to the field.
 *
 * The default state is the article's illustrative example, labelled
 * «Ejemplo» and computed on the server, so the HTML already carries the
 * result and the formula with the numbers substituted.
 *
 * Skin B (2026-10-07): the monthly cost is the one big number; each field is
 * a slider (the label names it) with a value chip that also takes an exact
 * number, since a 1–2000 slider cannot land on 437 by touch.
 */
export function Calculadora({ modelo }: { modelo: string }) {
  if (modelo !== "coste-entrada-manual") {
    throw new Error(`<Calculadora modelo="${modelo}">: no es un modelo de cálculo en src/lib/piezas/registry.ts.`);
  }
  return <CosteEntrada modelo={modelo} />;
}

type Borrador = Record<string, string>;

function aBorrador(e: EntradaInbox): Borrador {
  return Object.fromEntries(CAMPOS_INBOX.map((c) => [c.id, String(e[c.id as keyof EntradaInbox])]));
}

function CosteEntrada({ modelo }: { modelo: "coste-entrada-manual" }) {
  const ejemplo = PIEZAS[modelo].ejemplo;
  const [borrador, setBorrador] = useState<Borrador>(() => aBorrador(ejemplo));
  const [valida, setValida] = useState<EntradaInbox>(ejemplo);
  const [esEjemplo, setEsEjemplo] = useState(true);
  const pieza = usePieza();
  const marcarUso = useMarcaUso(modelo);
  const uid = useId();

  const resultado = computeInbox(valida);
  const shown = formatoInbox(resultado, valida);

  function errorDe(id: string): string | null {
    const campo = CAMPOS_INBOX.find((c) => c.id === id)!;
    const texto = borrador[id]?.trim() ?? "";
    if (texto === "") return "Escribe un número.";
    const n = Number(texto.replace(",", "."));
    if (!Number.isInteger(n)) return "Solo números enteros.";
    if (n < campo.min || n > campo.max) return `Entre ${campo.min} y ${campo.max}.`;
    return null;
  }

  function cambiar(id: string, texto: string) {
    marcarUso();
    const next = { ...borrador, [id]: texto };
    setBorrador(next);
    setEsEjemplo(false);
    const candidato = parseInbox(
      Object.fromEntries(Object.entries(next).map(([k, v]) => [k, Number(v.trim().replace(",", "."))])),
    );
    if (candidato) {
      setValida(candidato);
      pieza?.publicar({ modelo, entrada: candidato, ejemplo: false });
    }
  }

  function reiniciar() {
    setBorrador(aBorrador(ejemplo));
    setValida(ejemplo);
    setEsEjemplo(true);
    pieza?.publicar({ modelo, entrada: ejemplo, ejemplo: true });
  }

  const pendiente = CAMPOS_INBOX.some((c) => errorDe(c.id));

  return (
    <div className="@container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EtiquetaEstado ejemplo={esEjemplo} />
        <button type="button" onClick={reiniciar} disabled={esEjemplo} className={controlClass}>
          <Icon name="reset" />
          Volver al ejemplo
        </button>
      </div>

      {/* The answer first, big: what the manual entry costs a month. */}
      <section aria-label="Resultado" className="mt-5">
        <p className="text-[0.8125rem] font-semibold text-muted">Coste manual al mes</p>
        <p
          className="mt-1 font-display text-numeral-xl font-medium tabular-nums lining-nums text-accent-ink"
          aria-live="polite"
          aria-atomic="true"
        >
          {shown.costeMes}
        </p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-chrome">{shown.formula}</p>
        <dl className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3">
          <Cifra etiqueta="Documentos al mes" valor={shown.docsMes} />
          <Cifra etiqueta="Minutos al mes" valor={shown.minutosMes} />
          <Cifra etiqueta="Horas al mes" valor={shown.horasMes} />
        </dl>
      </section>

      <div className="mt-7 grid gap-x-8 gap-y-5 border-t border-border pt-6 @2xl:grid-cols-2">
        {CAMPOS_INBOX.map((campo) => {
          const id = `${uid}-${campo.id}`;
          const error = errorDe(campo.id);
          const actual = valida[campo.id as keyof EntradaInbox];
          const pct = ((actual - campo.min) / (campo.max - campo.min)) * 100;
          return (
            <div key={campo.id} className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={id} className="text-[0.9375rem] font-medium text-fg">
                  {campo.etiqueta}
                </label>
                {/* The value chip: shows the slider's value live and accepts
                    an exact number typed in. */}
                <span
                  className={cn(
                    "flex h-11 items-center rounded-full border bg-panel pl-3 pr-3 transition-colors duration-200 focus-within:border-accent-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-ring)]",
                    error ? "border-danger" : "border-border hover:border-faint",
                  )}
                >
                  <input
                    id={`${id}-exacto`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={borrador[campo.id]}
                    onChange={(e) => cambiar(campo.id, e.target.value)}
                    aria-label={`${campo.etiqueta}, valor exacto`}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={`${id}-ayuda`}
                    className="h-full w-[4.5ch] min-w-0 bg-transparent text-right text-[1.0625rem] font-medium text-fg tabular-nums focus:outline-none"
                  />
                  {campo.unidad ? (
                    <span aria-hidden className="pl-1 text-[0.875rem] text-muted">
                      {campo.unidad}
                    </span>
                  ) : null}
                </span>
              </div>
              <input
                id={id}
                type="range"
                min={campo.min}
                max={campo.max}
                step={campo.paso}
                value={actual}
                onChange={(e) => cambiar(campo.id, e.target.value)}
                aria-describedby={`${id}-ayuda`}
                aria-valuetext={`${actual}${campo.unidad ? ` ${campo.unidad}` : ""}`}
                className="deslizador mt-1"
                style={{ "--p": `${pct}%` } as React.CSSProperties}
              />
              <p
                id={`${id}-ayuda`}
                className={cn("text-[0.75rem] leading-snug", error ? "text-danger" : "text-muted")}
              >
                {error ?? campo.ayuda}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-[0.8125rem] leading-relaxed text-muted">
        {esEjemplo
          ? "Ejemplo ilustrativo del artículo, no un caso de cliente. Cambia los cuatro datos por los tuyos."
          : "Estimación con tus datos: es lo que cuesta hoy la entrada manual, no un ahorro."}
        {pendiente && !esEjemplo ? " Hay un campo por corregir: el resultado usa el último valor válido." : null}
      </p>

      <SinJs>Sin JavaScript ves el ejemplo calculado. Para usar tus números hace falta activarlo.</SinJs>
    </div>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.8125rem] leading-snug text-muted">{etiqueta}</dt>
      <dd className="mt-1 text-[1.375rem] font-semibold leading-tight text-fg">{valor}</dd>
    </div>
  );
}
