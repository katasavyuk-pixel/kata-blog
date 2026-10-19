import { cn } from "@/lib/utils";

/**
 * The site's icon set: drawn, not typed. Status and controls used to borrow
 * Unicode glyphs (● ◐ ▸ × ◌), which render in whatever font the platform
 * picks, at whatever weight, on whatever baseline. These are authored SVG in
 * one stroke (1.75 on a 24 grid, Lucide-style), sized in `em` so they follow
 * the text they sit next to.
 *
 * Decorative by default (`aria-hidden`). Pass `label` when the icon is the
 * only carrier of meaning — then it becomes `role="img"` with that name.
 */
export type IconName =
  | "dot"
  | "half"
  | "ring"
  | "dashed"
  | "play"
  | "cross"
  | "check"
  | "chevron-right"
  | "chevron-left"
  | "chevron-down"
  | "reset"
  | "plus"
  | "minus"
  | "alert"
  | "mail";

const paths: Record<IconName, React.ReactNode> = {
  // Filled disc: running / in production.
  dot: <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />,
  // Half disc: workshop / pilot / next.
  half: (
    <>
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 5.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" stroke="none" />
    </>
  ),
  ring: <circle cx="12" cy="12" r="6.5" />,
  // Dashed ring: no data yet.
  dashed: <circle cx="12" cy="12" r="6.5" strokeDasharray="3 3.4" />,
  play: <path d="M9 6.5v11l8.5-5.5z" fill="currentColor" />,
  cross: <path d="M7 7l10 10M17 7 7 17" />,
  check: <path d="m5.5 12.5 4.25 4.25L18.5 8" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  "chevron-left": <path d="m14.5 6-6 6 6 6" />,
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  reset: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4.5v4h4" />
    </>
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  minus: <path d="M5.5 12h13" />,
  alert: (
    <>
      <path d="M12 4.5 20.5 19h-17z" />
      <path d="M12 10v4M12 16.6v.1" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
};

export function Icon({
  name,
  label,
  className,
}: {
  name: IconName;
  /** Accessible name. Omit for decorative icons (the default). */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("inline-block shrink-0 align-[-0.125em]", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: false })}
    >
      {paths[name]}
    </svg>
  );
}
