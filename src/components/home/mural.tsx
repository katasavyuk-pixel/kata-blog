import Image from "next/image";
import Link from "next/link";
import type { Columna, Pieza } from "@/lib/mural";
import { entradasBitacora } from "@/lib/bitacora";
import { allPosts } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { NuevoBadge } from "@/components/home/nuevo-badge";
import { esNuevo, tituloEnFrase } from "@/lib/portada-texto";

const SIZES = "(min-width: 1024px) 30vw, (min-width: 640px) 60vw, 100vw";

/** A static, even row of the same three published sources as the former mural. */
export function Mural({ columnas }: { columnas: Columna[] }) {
  const piezas = columnas.flatMap((columna) => {
    const pieza = columna.piezas[0];
    return pieza ? [{ columna, pieza }] : [];
  });

  return (
    <div className="grid items-stretch gap-3 sm:grid-cols-3 sm:gap-4">
      {piezas.map(({ columna, pieza }) => (
        <Tarjeta
          key={columna.id}
          pieza={pieza}
          fecha={allPosts.find((post) => post.slug === pieza.id)?.date ?? entradasBitacora.find((entrada) => entrada.slug === pieza.id)?.fecha}
          normalizaTitulo={columna.id === "noticias"}
        />
      ))}
    </div>
  );
}

function Tarjeta({ pieza, fecha, normalizaTitulo }: { pieza: Pieza; fecha?: string; normalizaTitulo: boolean }) {
  const imagen = pieza.estilo === "foto" ? pieza.imagen.src : pieza.estilo === "skill" ? pieza.foto : undefined;
  const titulo = normalizaTitulo ? tituloEnFrase(pieza.titulo) : pieza.titulo;
  const nuevo = fecha ? esNuevo(fecha, new Date()) : false;
  const body = (
    <>
      <span className="relative block aspect-video overflow-hidden bg-surface-2">
        {imagen ? (
          <Image src={imagen} alt="" fill sizes={SIZES} className="object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center font-sans text-label text-muted">{pieza.kicker}</span>
        )}
      </span>
      <span className="flex flex-1 flex-col px-3 pb-3 pt-2.5 font-sans">
        <span className="flex min-w-0 items-center justify-between gap-2 text-[0.8125rem] font-semibold text-accent-ink">
          <span className="min-w-0 flex-1 truncate">{pieza.kicker}</span>
          {nuevo ? <span className="shrink-0 whitespace-nowrap"><NuevoBadge /></span> : null}
        </span>
        <span className="mt-1 line-clamp-3 font-display text-[1.0625rem] leading-snug text-fg">{titulo}</span>
      </span>
    </>
  );
  const className = cn(
    "group flex h-full min-w-0 flex-col border border-border bg-panel transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none",
  );

  return pieza.externo ? (
    <a href={pieza.href} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <Link href={pieza.href} className={className}>
      {body}
    </Link>
  );
}
