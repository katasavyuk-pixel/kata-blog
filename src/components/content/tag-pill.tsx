import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * One tag pill. There were three mutually incompatible versions of this — the
 * post card's (unlinked, py-1), the article header's (linked, py-0.5, its own
 * hover) and TagList's (bordered, with a count) — so the same tag looked like a
 * different control depending on where you met it.
 */
export function TagPill({
  tag,
  href,
  count,
  active = false,
  className,
}: {
  tag: string;
  /** Linked when set; a plain label otherwise. */
  href?: string;
  count?: number;
  active?: boolean;
  className?: string;
}) {
  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[0.8125rem] transition-colors",
    active
      ? "border-accent bg-accent text-on-accent"
      : "border-border bg-surface text-accent-ink",
    href && !active && "hover:border-accent",
    className,
  );

  const body = (
    <>
      <span>#{tag}</span>
      {count !== undefined ? (
        <span className={active ? "text-on-accent/75" : "text-faint"}>{count}</span>
      ) : null}
    </>
  );

  if (!href) return <span className={classes}>{body}</span>;
  return (
    <Link href={href} className={classes} aria-current={active ? "page" : undefined}>
      {body}
    </Link>
  );
}
