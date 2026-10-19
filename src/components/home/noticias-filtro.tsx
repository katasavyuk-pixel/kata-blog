"use client";

import { useState } from "react";

export type NoticiaDeLaHome = {
  url: string;
  titular: string;
  medio: string;
  /** The edition's axis key, and its name to print. */
  eje: string;
  tema: string;
};

/** How many headlines «Todo» shows; a theme shows all of its own. */
const MAX_TODO = 5;

/**
 * The brief items of the newest edition with a filter by theme. The server
 * renders «Todo» (the first five), so without JavaScript the reader still gets
 * the day's headlines; the chips only narrow them.
 */
export function NoticiasFiltro({ items }: { items: NoticiaDeLaHome[] }) {
  const [tema, setTema] = useState<string | null>(null);
  const temas = [...new Map(items.map((item) => [item.eje, item.tema])).entries()];
  const visibles = tema ? items.filter((item) => item.eje === tema) : items.slice(0, MAX_TODO);

  const chip = (activo: boolean) =>
    activo
      ? "min-h-10 rounded-full border border-fg bg-fg px-3.5 text-[0.875rem] font-semibold text-bg"
      : "min-h-10 rounded-full border border-faint bg-bg px-3.5 text-[0.875rem] font-semibold text-fg hover:border-fg";

  return (
    <div className="font-sans">
      {temas.length > 1 ? (
        <div role="group" aria-label="Filtrar por tema" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={tema === null} onClick={() => setTema(null)} className={chip(tema === null)}>
            Todo
          </button>
          {temas.map(([eje, nombre]) => (
            <button
              key={eje}
              type="button"
              aria-pressed={tema === eje}
              onClick={() => setTema(eje)}
              className={chip(tema === eje)}
            >
              {nombre}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="mt-3">
        {visibles.map((item) => (
          <li key={item.url} className="border-t border-border">
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block py-3">
              <span className="block font-display text-[1.125rem] leading-snug text-fg group-hover:text-accent-ink">
                {item.titular}
              </span>
              <span className="mt-1 block text-[0.8125rem] text-muted">
                {item.medio}, {item.tema.toLowerCase()}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
