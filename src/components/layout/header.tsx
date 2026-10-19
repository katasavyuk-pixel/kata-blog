import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Nav } from "./nav";
import { SuscribeteLink } from "@/components/newsletter/suscribete-link";
import { siteConfig } from "@/config/site";

/**
 * One quiet row: the name, the links, the way to the form. The interface
 * face throughout — the header is interface, not reading. The internal panel
 * keeps the same bar, sticky.
 */
export function Header({ variant = "public" }: { variant?: "public" | "internal" }) {
  const frame =
    variant === "public"
      ? "relative z-50 border-b border-border bg-bg font-sans"
      : "sticky top-0 z-50 border-b border-border bg-bg/90 font-sans backdrop-blur-md";

  return (
    <header data-site-header={variant} className={frame}>
      <Container size="wide" className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="text-[0.9375rem] font-semibold tracking-tight text-fg hover:text-accent-ink"
          aria-label={`${siteConfig.name}, inicio`}
        >
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Nav variant={variant} />
          <SuscribeteLink className="hidden text-sm text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current sm:inline">
            Suscríbete
          </SuscribeteLink>
        </div>
      </Container>
    </header>
  );
}
