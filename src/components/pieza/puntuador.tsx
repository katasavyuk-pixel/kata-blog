"use client";

import { useId, useState, type PointerEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  COMPROBACIONES_GEO,
  CRITERIOS_PROCESOS,
  FILAS_MAX,
  FILAS_MIN,
  FUNDAMENTOS_GEO,
  NOMBRE_MAX,
  NOTA_MAX,
  NOTA_MIN,
  PIEZAS,
  computeLista,
  computeProcesos,
  formatoLista,
  formatoProcesos,
  type EntradaLista,
  type EntradaProcesos,
} from "@/lib/piezas/registry";
import { usePieza } from "./pieza";
import { EtiquetaEstado, SinJs, controlClass } from "./marco";
import { useMarcaUso } from "./use-marca-uso";

/**
 * Rows the reader names × criteria they score → a ranking (`modo` omitted),
 * or a checklist with a count and the next pending item (`modo="lista"`).
 *
 * MDX passes only the model id; the criteria, the example and the maths come
 * from src/lib/piezas/registry.ts, which the server shares. The default state
 * is the model's «Ejemplo», rendered on the server with its result already
 * computed, so the piece reads correctly before (or without) hydration.
 *
 * `compacto` (home): read-only until the reader asks to change the scores.
 *
 * Skin B (2026-10-07): scores are segmented 1–5 controls — real radio groups
 * drawn as dots, so arrow keys work natively, every dot is a 44px target and
 * a pointer can drag across them — and the result is a set of big bars that
 * resize (transform only, 260ms, instant under reduced motion) as the scores
 * change. The leader is red with «1.º» in big mono.
 */
export function Puntuador({
  modelo,
  modo = "matriz",
  compacto = false,
}: {
  modelo: string;
  modo?: "matriz" | "lista";
  compacto?: boolean;
}) {
  const def = (PIEZAS as Record<string, { tipo: string } | undefined>)[modelo];
  if (!def) throw new Error(`<Puntuador modelo="${modelo}">: no existe en src/lib/piezas/registry.ts.`);
  if (def.tipo !== modo) {
    throw new Error(`<Puntuador modelo="${modelo}" modo="${modo}">: ese modelo es de tipo «${def.tipo}».`);
  }
  if (modelo === "prioridad-procesos") return <Matriz modelo={modelo} compacto={compacto} />;
  if (modelo === "comprobaciones-geo") return <Lista modelo={modelo} />;
  throw new Error(`<Puntuador modelo="${modelo}">: modelo sin vista.`);
}

// ---------------------------------------------------------------------------
// Matriz
// ---------------------------------------------------------------------------

const NOTAS = Array.from({ length: NOTA_MAX - NOTA_MIN + 1 }, (_, i) => NOTA_MIN + i);

const fieldClass =
  "h-11 w-full border border-border bg-bg font-sans text-[1rem] text-fg transition-colors duration-200 hover:border-faint focus:border-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]";

function copia(e: EntradaProcesos): EntradaProcesos {
  return { filas: e.filas.map((f) => ({ nombre: f.nombre, notas: [...f.notas] })) };
}

function Matriz({ modelo, compacto }: { modelo: "prioridad-procesos"; compacto: boolean }) {
  const ejemplo = PIEZAS[modelo].ejemplo;
  const [entrada, setEntrada] = useState<EntradaProcesos>(() => copia(ejemplo));
  const [esEjemplo, setEsEjemplo] = useState(true);
  const [editando, setEditando] = useState(!compacto);
  const pieza = usePieza();
  const marcarUso = useMarcaUso(modelo);
  const uid = useId();

  const resultado = computeProcesos(entrada);
  const shown = formatoProcesos(resultado);

  function cambiar(next: EntradaProcesos) {
    marcarUso();
    setEntrada(next);
    setEsEjemplo(false);
    pieza?.publicar({ modelo, entrada: next, ejemplo: false });
  }

  function reiniciar() {
    const next = copia(ejemplo);
    setEntrada(next);
    setEsEjemplo(true);
    pieza?.publicar({ modelo, entrada: next, ejemplo: true });
  }

  function setNombre(i: number, nombre: string) {
    const next = copia(entrada);
    next.filas[i].nombre = nombre.slice(0, NOMBRE_MAX);
    cambiar(next);
  }

  function setNota(i: number, k: number, nota: number) {
    if (entrada.filas[i].notas[k] === nota) return;
    const next = copia(entrada);
    next.filas[i].notas[k] = nota;
    cambiar(next);
  }

  function anadir() {
    if (entrada.filas.length >= FILAS_MAX) return;
    const next = copia(entrada);
    next.filas.push({ nombre: "", notas: CRITERIOS_PROCESOS.map(() => 3) });
    cambiar(next);
  }

  function quitar(i: number) {
    if (entrada.filas.length <= FILAS_MIN) return;
    const next = copia(entrada);
    next.filas.splice(i, 1);
    cambiar(next);
  }

  return (
    <div className="@container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EtiquetaEstado ejemplo={esEjemplo} />
        {editando ? (
          <button type="button" onClick={reiniciar} disabled={esEjemplo} className={controlClass}>
            <Icon name="reset" />
            Volver al ejemplo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className={controlClass}
            aria-controls={`${uid}-tabla`}
          >
            Cambiar las notas
          </button>
        )}
      </div>

      {/* Result first in the compact (home) view: the bars are the piece. */}
      {!editando ? <Orden shown={shown} resultado={resultado} esEjemplo={esEjemplo} /> : null}

      {editando ? (
        <>
          {/* The five questions, as the article asks them. 5 is always the
              better first candidate, so «Coste del error» and «Revisión» read
              the other way round from how people usually say them. */}
          <dl className="mt-5 grid gap-x-6 gap-y-3 text-[0.8125rem] leading-snug @xl:grid-cols-2 @4xl:grid-cols-3">
            {CRITERIOS_PROCESOS.map((k) => (
              <div key={k.id}>
                <dt className="font-semibold text-fg">{k.corto}</dt>
                <dd className="mt-0.5 text-muted">
                  {k.pregunta}{" "}
                  <span className="whitespace-nowrap text-chrome">
                    1 {k.uno} · 5 {k.cinco}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <ol id={`${uid}-tabla`} className="mt-6 grid gap-4">
            {entrada.filas.map((fila, i) => {
              const nombreId = `${uid}-nombre-${i}`;
              const vacio = fila.nombre.trim() === "";
              const quien = vacio ? `proceso ${i + 1}` : fila.nombre;
              const total = fila.notas.reduce((a, b) => a + b, 0);
              return (
                <li key={i} className="border border-border bg-bg p-3 sm:p-4">
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={nombreId}
                        className="mb-1 block text-[0.8125rem] font-semibold text-muted"
                      >
                        Proceso {i + 1}
                      </label>
                      <input
                        id={nombreId}
                        type="text"
                        value={fila.nombre}
                        maxLength={NOMBRE_MAX}
                        onChange={(e) => setNombre(i, e.target.value)}
                        aria-describedby={vacio ? `${nombreId}-ayuda` : undefined}
                        className={cn(fieldClass, "px-3")}
                      />
                    </div>
                    <p className="flex h-11 shrink-0 items-center px-1 text-[1.125rem] font-semibold tabular-nums text-fg">
                      {total}
                      <span className="text-faint">/{resultado.maximo}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => quitar(i)}
                      disabled={entrada.filas.length <= FILAS_MIN}
                      aria-label={`Quitar ${vacio ? `proceso ${i + 1}` : `«${fila.nombre}»`}`}
                      className={cn(controlClass, "text-muted")}
                    >
                      <Icon name="cross" />
                    </button>
                  </div>
                  {vacio ? (
                    <p id={`${nombreId}-ayuda`} className="mt-1 text-[0.75rem] text-muted">
                      Sin nombre sale como «Proceso {i + 1}».
                    </p>
                  ) : null}

                  <div className="mt-3 grid gap-x-6 @2xl:grid-cols-2">
                    {CRITERIOS_PROCESOS.map((k, j) => (
                      <Segmentado
                        key={k.id}
                        name={`${uid}-n-${i}-${j}`}
                        etiqueta={k.corto}
                        nombreAccesible={`${k.corto}, ${quien}`}
                        valor={fila.notas[j]}
                        onChange={(n) => setNota(i, j, n)}
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={anadir}
              disabled={entrada.filas.length >= FILAS_MAX}
              className={controlClass}
            >
              <Icon name="plus" />
              Añadir proceso
            </button>
            <p className="text-[0.75rem] text-muted">
              Hasta {FILAS_MAX} procesos y {NOMBRE_MAX} caracteres por nombre.
            </p>
          </div>

          <Orden shown={shown} resultado={resultado} esEjemplo={esEjemplo} />
        </>
      ) : null}

      <SinJs>Sin JavaScript ves el ejemplo ya puntuado. Para puntuar tus procesos hace falta activarlo.</SinJs>
    </div>
  );
}

/**
 * A 1–5 score as five dots: a real radio group (one `name`), so Tab enters
 * it, arrow keys move and select, and each dot is a 44px label. Dots up to
 * the value fill red (●●●○○). Dragging a pressed pointer across the dots sets
 * the value under it; `touch-action: pan-y` keeps vertical scrolling.
 */
function Segmentado({
  name,
  etiqueta,
  nombreAccesible,
  valor,
  onChange,
}: {
  name: string;
  etiqueta: string;
  nombreAccesible: string;
  valor: number;
  onChange: (n: number) => void;
}) {
  function arrastrar(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.buttons !== 1) return;
    if (e.pointerType !== "mouse" && e.pressure === 0) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-nota]");
    if (!el || !e.currentTarget.contains(el)) return;
    const n = Number(el.dataset.nota);
    if (n !== valor) onChange(n);
  }

  return (
    <fieldset className="flex min-w-0 items-center justify-between gap-2">
      <legend className="sr-only">{nombreAccesible}</legend>
      <span aria-hidden className="min-w-0 truncate text-[0.875rem] text-chrome">
        {etiqueta}
      </span>
      <div
        className="seg"
        onPointerDown={(e) => {
          // Touch captures the pointer on the dot it started on; release it
          // so a drag can move across the sibling dots.
          const target = e.target as Element;
          if (target.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId);
        }}
        onPointerMove={arrastrar}
      >
        {NOTAS.map((n) => (
          <label
            key={n}
            className="seg-opcion"
            data-nota={n}
            data-lleno={n <= valor ? "" : undefined}
            data-actual={n === valor ? "" : undefined}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={n === valor}
              onChange={() => onChange(n)}
            />
            <span className="seg-punto" aria-hidden />
            <span className="sr-only">
              {n} de {NOTA_MAX}
            </span>
          </label>
        ))}
      </div>
      <span aria-hidden className="w-5 text-right text-[1rem] font-semibold tabular-nums text-fg">
        {valor}
      </span>
    </fieldset>
  );
}

/** The two criteria a row scores highest on: «why it ranks where it does». */
function chipsDe(notas: number[]): { id: string; texto: string }[] {
  return CRITERIOS_PROCESOS.map((k, j) => ({ id: k.id, corto: k.corto, nota: notas[j], j }))
    .sort((a, b) => b.nota - a.nota || a.j - b.j)
    .slice(0, 2)
    .map((c) => ({ id: c.id, texto: `${c.corto} ${c.nota}` }));
}

function Orden({
  shown,
  resultado,
  esEjemplo,
}: {
  shown: ReturnType<typeof formatoProcesos>;
  resultado: ReturnType<typeof computeProcesos>;
  esEjemplo: boolean;
}) {
  return (
    <section aria-label="Orden" className="mt-7">
      <p className="text-[0.8125rem] font-semibold text-muted">
        Orden {esEjemplo ? "del ejemplo" : "con tus notas"}
      </p>
      <p className="mt-2 font-display text-[1.25rem] leading-snug text-fg" aria-live="polite" aria-atomic="true">
        {shown.veredicto}
      </p>
      <ol className="mt-5 grid gap-5">
        {resultado.puestos.map((p, i) => {
          const f = shown.filas[i];
          const lider = p.puesto === 1;
          return (
            <li
              key={p.indice}
              className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[5rem_minmax(0,1fr)]"
            >
              <span
                className={cn(
                  "font-display leading-none lining-nums",
                  lider ? "text-numeral font-medium text-accent-ink" : "pt-1 text-[1.5rem] text-faint",
                )}
              >
                {f.puesto}
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={cn("min-w-0 text-[1rem] leading-snug", lider ? "font-semibold text-fg" : "text-chrome")}>
                    {f.nombre}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      lider ? "text-[1.375rem] font-semibold text-fg" : "text-[1.0625rem] text-muted",
                    )}
                  >
                    {p.total}
                    <span className="text-faint">/{resultado.maximo}</span>
                  </span>
                </div>
                <span aria-hidden className={cn("barra mt-2", lider ? "h-4" : "h-3")}>
                  <span
                    className={lider ? "bg-accent" : "bg-faint"}
                    style={{ transform: `scaleX(${p.total / resultado.maximo})` }}
                  />
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {chipsDe(p.notas).map((c) => (
                    <span
                      key={c.id}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.8125rem]",
                        lider ? "border-amber/45 text-amber" : "border-border text-chrome",
                      )}
                    >
                      {c.texto}
                    </span>
                  ))}
                </span>
                {p.aviso ? (
                  <span className="mt-2 flex gap-1.5 text-[0.8125rem] leading-snug text-amber">
                    <Icon name="alert" className="mt-[0.2em]" />
                    <span>{p.aviso}</span>
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

function Lista({ modelo }: { modelo: "comprobaciones-geo" }) {
  const ejemplo = PIEZAS[modelo].ejemplo;
  const [entrada, setEntrada] = useState<EntradaLista>(() => ({ hechas: [...ejemplo.hechas] }));
  const [esEjemplo, setEsEjemplo] = useState(true);
  const pieza = usePieza();
  const marcarUso = useMarcaUso(modelo);
  const uid = useId();

  const resultado = computeLista(entrada);
  const shown = formatoLista(resultado);
  const hechas = new Set(entrada.hechas);

  function alternar(i: number) {
    marcarUso();
    const set = new Set(entrada.hechas);
    if (set.has(i)) set.delete(i);
    else set.add(i);
    const next = { hechas: [...set].sort((a, b) => a - b) };
    setEntrada(next);
    setEsEjemplo(false);
    pieza?.publicar({ modelo, entrada: next, ejemplo: false });
  }

  function reiniciar() {
    const next = { hechas: [...ejemplo.hechas] };
    setEntrada(next);
    setEsEjemplo(true);
    pieza?.publicar({ modelo, entrada: next, ejemplo: true });
  }

  return (
    <div className="@container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EtiquetaEstado ejemplo={esEjemplo} />
        <button type="button" onClick={reiniciar} disabled={esEjemplo} className={controlClass}>
          <Icon name="reset" />
          Volver al ejemplo
        </button>
      </div>

      {/* The meter first: how far along, at a glance, then the rows. */}
      <section aria-label="Resultado" className="mt-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="font-display text-numeral-xl font-medium tabular-nums lining-nums text-fg">
            {resultado.hechas}
            <span className="text-numeral text-faint">/{resultado.total}</span>
          </p>
          <p className="text-[0.9375rem] text-chrome">
            {esEjemplo ? "hechas en el ejemplo" : "hechas"}
          </p>
        </div>
        <span aria-hidden className="mt-3 grid grid-cols-9 gap-1.5">
          {COMPROBACIONES_GEO.map((item, i) => (
            <span key={item.id} className="barra h-3">
              <span
                className={hechas.has(i) ? "bg-accent" : "bg-transparent"}
                style={{ transform: hechas.has(i) ? "scaleX(1)" : "scaleX(0)" }}
              />
            </span>
          ))}
        </span>
        <p className="mt-3 font-display text-[1.125rem] leading-snug text-fg" aria-live="polite">
          {shown.veredicto}
        </p>
        <p className="sr-only">{shown.cuenta}</p>
      </section>

      <p className="mt-5 text-[0.8125rem] leading-relaxed text-muted">
        Marca las que ya has comprobado en tu sitio. Las tres primeras, en rojo, son las que rompen todo lo demás.
      </p>

      <fieldset className="mt-3">
        <legend className="sr-only">Comprobaciones hechas</legend>
        <ol className="grid gap-1.5">
          {COMPROBACIONES_GEO.map((item, i) => {
            const id = `${uid}-c-${i}`;
            const hecha = hechas.has(i);
            const siguiente = resultado.siguiente === i;
            return (
              <li key={item.id}>
                <label
                  htmlFor={id}
                  className={cn(
                    "group grid min-h-14 cursor-pointer grid-cols-[2.75rem_1.75rem_minmax(0,1fr)] items-center gap-x-2 border px-1 py-3 transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-ring)]",
                    hecha ? "border-transparent bg-surface" : "border-border hover:border-faint",
                    siguiente && "border-amber/60",
                  )}
                >
                  <span
                    className={cn(
                      "text-center font-display text-[1.25rem] tabular-nums lining-nums",
                      i < FUNDAMENTOS_GEO ? "text-accent-ink" : "text-faint",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="relative flex size-7 items-center justify-center">
                    <input
                      id={id}
                      type="checkbox"
                      checked={hecha}
                      onChange={() => alternar(i)}
                      className="peer absolute inset-0 size-7 cursor-pointer appearance-none rounded-sm border-2 border-faint bg-bg transition-colors duration-200 checked:border-accent checked:bg-accent focus-visible:outline-none"
                    />
                    <Icon
                      name="check"
                      className="pointer-events-none relative text-[1.125rem] text-on-accent opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                    />
                  </span>
                  <span className="min-w-0 pr-2">
                    <span className={cn("block text-[0.9375rem] leading-snug", hecha ? "text-muted line-through decoration-faint" : "text-fg")}>
                      {item.titulo}
                      {siguiente ? (
                        <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap text-[0.8125rem] font-semibold text-amber no-underline">
                          <Icon name="half" />
                          siguiente
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{item.porque}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ol>
      </fieldset>

      <SinJs>Sin JavaScript ves el ejemplo. Para marcar las tuyas hace falta activarlo.</SinJs>
    </div>
  );
}
