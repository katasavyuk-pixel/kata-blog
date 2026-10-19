import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * One lesson of the course as a numbered row. Only /empieza-aqui lists
 * lessons this way: the course is the one sequence on the site, so the
 * number is information, not decoration. State (done / next) comes from the
 * caller, which owns the localStorage progress.
 */
export function LeccionRow({
  index,
  title,
  description,
  href,
  done = false,
  next = false,
}: {
  index: number;
  title: string;
  description: string;
  href: string;
  done?: boolean;
  next?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-border py-5 sm:grid-cols-[3rem_minmax(0,1fr)]"
      >
        <span
          aria-hidden
          className={cn(
            "font-display text-numeral font-medium leading-none lining-nums",
            done ? "text-accent-ink" : "text-faint",
          )}
        >
          {done ? <Icon name="check" /> : index}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[0.8125rem] text-muted">
            <span>Lección {index}</span>
            {next ? (
              <span className="inline-flex items-center gap-1.5 text-amber">
                <Icon name="half" />
                siguiente
              </span>
            ) : null}
            {done ? (
              <span className="inline-flex items-center gap-1.5 text-accent-ink">
                <Icon name="dot" />
                completada
              </span>
            ) : null}
          </span>
          <span className="mt-1.5 block font-display text-h3 font-semibold leading-tight text-fg group-hover:text-accent-ink">
            {title}
          </span>
          <span className="mt-1.5 block max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted">
            {description}
          </span>
        </span>
      </Link>
    </li>
  );
}
