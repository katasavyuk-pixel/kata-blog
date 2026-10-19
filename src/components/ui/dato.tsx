import { cn } from "@/lib/utils";

/**
 * A number the site stands behind. The source is a prop, not a convention:
 * rendering a `Dato` without one throws, so a figure cannot reach a page
 * without saying where it came from (VOZ.md's one rule, stated twice).
 *
 * `comprobado` (ISO date) prints "comprobado el …" after the source, for
 * figures that go stale — a monthly cost, a count.
 */
export function Dato({
  valor,
  fuente,
  comprobado,
  unidad,
  className,
}: {
  valor: string;
  fuente: string;
  comprobado?: string;
  unidad?: string;
  className?: string;
}) {
  if (!fuente || !fuente.trim()) {
    throw new Error(`<Dato valor="${valor}"> sin fuente. Una cifra sin origen no se publica.`);
  }
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="font-display text-numeral font-medium lining-nums text-fg">
        {valor}
        {unidad ? <span className="ml-1 font-sans text-label font-normal text-muted">{unidad}</span> : null}
      </span>
      <span className="font-sans text-label text-faint">
        fuente: {fuente}
        {comprobado ? (
          <>
            {" "}
            · comprobado el{" "}
            <time dateTime={comprobado}>{formatComprobado(comprobado)}</time>
          </>
        ) : null}
      </span>
    </span>
  );
}

function formatComprobado(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
