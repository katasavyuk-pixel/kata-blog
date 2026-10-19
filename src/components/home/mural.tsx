import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { MuralMovimiento } from "@/components/home/mural-movimiento";
import "./mural.css";
import { COMO_SE_HACE_HREF, ETIQUETA_IA } from "@/config/noticias";
import { cn } from "@/lib/utils";
import type { Columna, Pieza } from "@/lib/mural";

/**
 * The home's mural (2026-10-15, «D»): the day's news, the skills and the build
 * log as three columns of cards that drift past the headline, the first and
 * last upwards and the middle one down. It sits beside the h1, never before
 * it (DESIGN.md rule 1), and DESIGN.md records it as the one exception to
 * «movement only as a response».
 *
 * Each column holds its cards twice and slides by exactly one copy, so the
 * loop has no seam; the second copy is hidden from screen readers and from
 * the tab order. On a phone the news column goes (the news door is right
 * below) and the other two stay.
 */
export function Mural({ columnas }: { columnas: Columna[] }) {
  const ocultaEnMovil = (id: Columna["id"]) => id === "noticias" && columnas.length === 3;

  return (
    <div>
      <div className={cn("grid gap-3.5", columnas.length === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
        {columnas.map((columna) => (
          <div key={columna.id} className={cn("min-w-0 border-t-[3px] border-accent pt-2 font-sans", ocultaEnMovil(columna.id) && "hidden sm:block")}>
            <Link href={columna.href} prefetch={false} className="block text-[0.8125rem] font-bold uppercase tracking-[0.06em] text-fg hover:text-accent-ink">
              {columna.etiqueta}
            </Link>
            {columna.id === "noticias" ? (
              <Link href={COMO_SE_HACE_HREF} className="mt-0.5 block text-[0.75rem] leading-snug text-muted hover:underline">
                {ETIQUETA_IA}
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <MuralMovimiento>
        <div
          className={cn(
            "mt-3 grid h-[460px] gap-3.5 overflow-hidden sm:h-[600px]",
            columnas.length === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2",
          )}
          style={{ maskImage: "linear-gradient(180deg, #000 0%, #000 86%, transparent)" }}
        >
          {columnas.map((columna) => (
            <div key={columna.id} className={cn("min-w-0", ocultaEnMovil(columna.id) && "hidden sm:block")}>
              <div
                className="mural-columna"
                data-sentido={columna.sentido}
                style={{ "--mural-dur": `${columna.segundos}s` } as CSSProperties}
              >
                <ul>
                  {columna.piezas.map((pieza) => (
                    <li key={pieza.id} className="pb-3.5">
                      <Tarjeta pieza={pieza} />
                    </li>
                  ))}
                </ul>
                <ul aria-hidden>
                  {columna.piezas.map((pieza) => (
                    <li key={pieza.id} className="pb-3.5">
                      <Tarjeta pieza={pieza} copia />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </MuralMovimiento>
    </div>
  );
}

const SIZES = "(min-width: 1024px) 15vw, (min-width: 640px) 30vw, 45vw";
// Eager: a card slides into view by `transform`, which lazy loading notices
// late or never, and left the cover blurred. They are small (≈256 px wide).

function Envoltura({
  pieza,
  copia,
  className,
  style,
  children,
}: {
  pieza: Pieza;
  copia: boolean;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const clase = cn("mural-pieza group block", className);
  const tabIndex = copia ? -1 : undefined;
  return pieza.externo ? (
    <a href={pieza.href} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex} className={clase} style={style}>
      {children}
    </a>
  ) : (
    // No prefetch: a card that drifts in and out of view would prefetch its
    // page again and again (hundreds of requests a minute in a local test).
    <Link href={pieza.href} prefetch={false} tabIndex={tabIndex} className={clase} style={style}>
      {children}
    </Link>
  );
}

function Tarjeta({ pieza, copia = false }: { pieza: Pieza; copia?: boolean }) {
  if (pieza.estilo === "foto") {
    return (
      <Envoltura pieza={pieza} copia={copia} className="overflow-hidden border border-border bg-panel">
        <span className="relative block aspect-[4/3] overflow-hidden bg-surface-2">
          <Image
            src={pieza.imagen.src}
            alt=""
            fill
            sizes={SIZES}
            loading="eager"
            placeholder={pieza.imagen.blurDataURL ? "blur" : "empty"}
            blurDataURL={pieza.imagen.blurDataURL}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </span>
        <span className="block px-3 pb-3 pt-2.5 font-sans">
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-accent-ink">{pieza.kicker}</span>
          <span className="mt-1 block font-display text-[1rem] leading-snug text-fg">{pieza.titulo}</span>
        </span>
      </Envoltura>
    );
  }

  if (pieza.estilo === "skill") {
    return (
      <Envoltura pieza={pieza} copia={copia} className="overflow-hidden" style={{ backgroundColor: pieza.color }}>
        {pieza.foto ? (
          <span className="relative block aspect-[4/5] overflow-hidden">
            <Image src={pieza.foto} alt="" fill sizes={SIZES} loading="eager" className="object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
          </span>
        ) : null}
        <span className={cn("block px-3 pb-3.5 pt-3 font-sans text-on-accent", !pieza.foto && "flex aspect-[4/5] flex-col justify-between")}>
          <svg aria-hidden width={pieza.foto ? 26 : 44} height={pieza.foto ? 26 : 44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d={pieza.icono} />
          </svg>
          <span className="block">
            <span className="mt-2 block text-[1.0625rem] font-bold leading-tight">{pieza.titulo}</span>
            <span className="mt-1 block text-[0.8125rem] leading-snug">{pieza.pie}</span>
          </span>
        </span>
      </Envoltura>
    );
  }

  const fondo = {
    tinta: "bg-fg text-bg",
    papel: "border border-t-[3px] border-border border-t-accent bg-panel text-fg",
    rojo: "bg-accent text-on-accent",
  }[pieza.estilo];
  const pie = { tinta: "text-bg/75", papel: "text-muted", rojo: "text-on-accent" }[pieza.estilo];

  return (
    <Envoltura pieza={pieza} copia={copia} className={cn("min-h-36 px-3.5 pb-4 pt-3.5 font-sans", fondo)}>
      <span className={cn("flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em]", pieza.estilo === "papel" && "text-accent-ink")}>
        {pieza.estilo === "tinta" ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" /> : null}
        {pieza.kicker}
      </span>
      <span className={cn("mt-2 block font-display leading-snug", pieza.estilo === "rojo" ? "text-[1.25rem] font-medium" : "text-[1.125rem]")}>
        {pieza.titulo}
      </span>
      {pieza.pie ? (
        <span className={cn("mt-2.5 block text-[0.75rem]", pie)}>
          {pieza.pie}
          {pieza.externo ? <span className="sr-only"> (se abre en otra pestaña)</span> : null}
        </span>
      ) : null}
    </Envoltura>
  );
}
