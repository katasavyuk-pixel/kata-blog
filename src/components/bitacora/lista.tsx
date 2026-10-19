"use client";

import { useState } from "react";
import Link from "next/link";
import { PROYECTOS, TIPOS_ENTRADA, type Proyecto, type TipoEntrada } from "@/config/bitacora";
import { formatDate } from "@/lib/format";

export type EntradaVista = {
  slug: string;
  titulo: string;
  fecha: string;
  proyecto: Proyecto;
  tipo: TipoEntrada;
  enlace: string;
  youtubeId?: string;
  html: string;
};

/** «2026-10» → «Octubre de 2026». */
function nombreDeMes(mes: string): string {
  const nombre = new Date(`${mes}-01T12:00:00Z`).toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

/**
 * The build log, month by month, with a filter by project. The server renders
 * every entry, so without JavaScript nothing is hidden; the chips only narrow
 * it. Each entry is an anchor (#slug), which is what the feed links to.
 */
export function BitacoraLista({ entradas }: { entradas: EntradaVista[] }) {
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const proyectos = [...new Set(entradas.map((e) => e.proyecto))];
  const visibles = proyecto ? entradas.filter((e) => e.proyecto === proyecto) : entradas;

  const meses = new Map<string, EntradaVista[]>();
  for (const entrada of visibles) {
    const mes = entrada.fecha.slice(0, 7);
    meses.set(mes, [...(meses.get(mes) ?? []), entrada]);
  }

  const chip = (activo: boolean) =>
    activo
      ? "min-h-10 rounded-full border border-fg bg-fg px-3.5 text-[0.875rem] font-semibold text-bg"
      : "min-h-10 rounded-full border border-faint bg-bg px-3.5 text-[0.875rem] font-semibold text-fg hover:border-fg";

  return (
    <div>
      <div role="group" aria-label="Filtrar por proyecto" className="flex flex-wrap gap-2 font-sans">
        <button type="button" aria-pressed={proyecto === null} onClick={() => setProyecto(null)} className={chip(proyecto === null)}>
          Todo
        </button>
        {proyectos.map((p) => (
          <button key={p} type="button" aria-pressed={proyecto === p} onClick={() => setProyecto(p)} className={chip(proyecto === p)}>
            {PROYECTOS[p]}
          </button>
        ))}
      </div>

      {[...meses].map(([mes, lista]) => (
        <section key={mes} aria-labelledby={`mes-${mes}`} className="mt-12">
          <h2 id={`mes-${mes}`} className="border-t-[3px] border-accent pt-4 text-h2 font-medium">
            {nombreDeMes(mes)}
          </h2>
          <ol className="mt-2">
            {lista.map((entrada) => {
              const tipo = TIPOS_ENTRADA[entrada.tipo];
              const externo = entrada.enlace.startsWith("http");
              return (
                <li key={entrada.slug} id={entrada.slug} className="grid scroll-mt-24 gap-x-8 gap-y-1 border-t border-border py-6 first:border-t-0 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <p className="font-sans text-[0.8125rem] text-muted">
                    <time dateTime={entrada.fecha}>{formatDate(entrada.fecha)}</time>
                    <span className="block font-semibold text-fg">{PROYECTOS[entrada.proyecto]}</span>
                  </p>
                  <div className="min-w-0">
                    <p className="font-sans text-[0.8125rem] font-semibold text-accent-ink">
                      <span aria-hidden>{tipo.glifo}</span> {tipo.label}
                    </p>
                    <h3 className="mt-1 font-display text-[1.375rem] font-medium leading-snug">{entrada.titulo}</h3>
                    <div
                      className="mt-2 max-w-[62ch] text-[1.0625rem] leading-relaxed text-muted [&_a]:text-accent-ink [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: entrada.html }}
                    />
                    <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-sans text-[0.9375rem]">
                      {externo ? (
                        <a href={entrada.enlace} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-ink underline underline-offset-[0.18em] hover:decoration-2">
                          Verlo
                        </a>
                      ) : (
                        <Link href={entrada.enlace} className="font-semibold text-accent-ink underline underline-offset-[0.18em] hover:decoration-2">
                          Verlo
                        </Link>
                      )}
                      {entrada.youtubeId ? (
                        <Link href={`/videos#video-${entrada.youtubeId}`} className="text-muted hover:text-fg">
                          Ver el vídeo
                        </Link>
                      ) : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
