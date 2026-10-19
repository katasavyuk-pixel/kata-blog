import Link from "next/link";
import Image from "next/image";
import { Dato } from "@/components/ui/dato";
import { Estado } from "@/components/sistema/estado";
import { cn } from "@/lib/utils";
import type { ResolvedLibraryItem } from "@/lib/library";
import { Icon } from "@/components/ui/icon";
import { Cover } from "@/components/content/cover";
import type { Post } from "@/lib/posts";

/**
 * The ficha of a system: what it does, what it costs a month, what broke.
 *
 * Server component. Every row is a fact from config/library, and the two
 * invariants that protect it (`assertEvidencia`, `assertCosteMensual`) run
 * at module load, so a ficha cannot ship a number without its source or a
 * status without its date. A system with nothing documented as broken shows
 * «nada documentado todavía» rather than an empty row: the absence is the
 * information.
 *
 * `compact` drops the screenshot and the resource link — the home and the
 * article header want the data, not the full card. `post` (listings only)
 * adds the article's documentary cover on top; the article page shows its
 * cover itself, so it never passes one.
 *
 * Skin A (2026-10-07): the status is a pill (icon + label + colour), «Qué se
 * rompió» is the emphasised block — it is what nobody else publishes — and an
 * unmeasured cost is one quiet line instead of a loud row repeated on every
 * card.
 */
export function Ficha({
  item,
  compact = false,
  heading = "h3",
  post,
  className,
}: {
  item: ResolvedLibraryItem;
  compact?: boolean;
  heading?: "h2" | "h3";
  /** The backing post, when the listing wants its cover on the card. */
  post?: Post;
  className?: string;
}) {
  const Heading = heading;
  const titled = item.href && !compact;
  const linked = item.href && post;
  const coste = item.costeMensual;

  return (
    <article
      className={cn("group font-sans", !post && "border-t border-border pt-5", className)}
      aria-label={`Ficha: ${item.title}`}
    >
      {post ? <Cover post={post} sizes="(min-width: 1024px) 560px, 100vw" className="mb-5" /> : null}

      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Estado evidencia={item.evidencia} variant="pill" />
        <span className="font-sans text-[0.8125rem] text-muted">{item.format}</span>
      </header>

      <Heading className="mt-3 font-display text-[1.5rem] font-semibold leading-tight text-fg">
        {titled || linked ? (
          <Link href={item.href!} className="group-hover:text-accent-ink">
            {item.title}
          </Link>
        ) : (
          item.title
        )}
      </Heading>

      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{item.queHace}</p>

      {/* What broke: the brand's differentiator, so it is the one block with
          a surface of its own. With nothing documented it is left out: a
          "nada todavía" box in red reads as filler, not as honesty. */}
      {item.seRompio.length > 0 ? (
        <section aria-label="Qué se rompió" className="mt-4 rounded-sm bg-accent/12 px-4 py-3.5">
          <p className="flex items-center gap-2 font-sans text-[0.8125rem] font-semibold text-accent-ink">
            <Icon name="cross" />
            Qué se rompió
          </p>
          <ul className="mt-2 grid gap-2 text-[0.9375rem] leading-relaxed text-fg">
            {item.seRompio.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {coste.medido ? (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-sans text-[0.8125rem] text-muted">Coste al mes</span>
          <Dato valor={coste.valor} fuente={coste.fuente} comprobado={coste.comprobado} />
        </div>
      ) : (
        <p className="mt-3 flex items-baseline gap-1.5 text-[0.8125rem] leading-snug text-muted">
          <Icon name="dashed" className="text-amber" />
          <span>
            Coste sin medir aún{compact ? "" : `: ${coste.motivo}`}.
          </span>
        </p>
      )}

      {!compact && item.recurso ? (
        <p className="mt-4 text-[0.9375rem]">
          <span className="mr-2 font-sans text-[0.8125rem] text-muted">Recurso</span>
          <Link
            href={item.recurso.href}
            className="text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
          >
            {item.recurso.label}
          </Link>
        </p>
      ) : null}

      {!compact && item.captura ? (
        <figure className="mt-5 overflow-hidden border border-border bg-surface">
          <Image
            src={item.captura.src}
            alt={item.captura.alt}
            width={1200}
            height={675}
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="h-auto w-full"
          />
        </figure>
      ) : null}
    </article>
  );
}
