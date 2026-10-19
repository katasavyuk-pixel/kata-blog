import { LOGOS_DE_SKILL } from "@/config/logos";
import { cn } from "@/lib/utils";

/**
 * A skill's logo: its glyph in white on its own colour (config/logos.ts). The
 * name always sits next to it in the markup, so the logo is decoration for a
 * screen reader. Renders nothing for a skill without a logo; the test keeps
 * that from happening to an installable one.
 */
export function LogoSkill({ id, size = 56, className }: { id: string; size?: number; className?: string }) {
  const logo = LOGOS_DE_SKILL[id];
  if (!logo) return null;
  return (
    <span
      aria-hidden
      className={cn("logo-skill", className)}
      style={{ width: size, height: size, backgroundColor: logo.color }}
    >
      <svg
        width={Math.round(size / 2)}
        height={Math.round(size / 2)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={logo.icono} />
      </svg>
    </span>
  );
}
