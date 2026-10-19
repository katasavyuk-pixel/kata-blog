import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { feeds, footerLinks, legalLinks, navLinks, siteConfig } from "@/config/site";
import { fechaDeVersion } from "@/lib/version";

const linkClass = "text-sm text-muted transition-colors hover:text-fg";

/**
 * Byline and the form where the page has none, then the three lists: where
 * to go next, the feeds, the profiles that leave the site.
 *
 * `signup` is false on the routes that already render their own form
 * (`hasOwnSignupForm` in config/site): one signup form per page.
 */
export function Footer({
  variant = "public",
  signup = true,
}: {
  variant?: "public" | "internal";
  signup?: boolean;
}) {
  const version = fechaDeVersion();

  return (
    <footer data-site-footer={variant} className="border-t border-border font-sans text-muted">
      <Container
        size="wide"
        className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]"
      >
        <div className="max-w-sm">
          <Link href="/" className="text-[0.9375rem] font-semibold tracking-tight text-fg hover:text-accent-ink" aria-label={`${siteConfig.name}, inicio`}>
            {siteConfig.name}
          </Link>
          <p className="mt-3 text-sm leading-relaxed">{siteConfig.home.titular}</p>
          {/* Who makes it, said once and quietly: the person is in «Sobre mí»,
              not in front of what the reader came to do (2026-10-14). */}
          <p className="mt-2 text-sm leading-relaxed">
            Escribe y mantiene este sitio {siteConfig.author.name}.{" "}
            <Link href="/sobre-mi" className="text-fg underline underline-offset-[0.18em] hover:text-accent-ink">
              Sobre mí
            </Link>
          </p>
          {signup ? (
            <div className="mt-5">
              <SubscribeForm source="footer" />
            </div>
          ) : null}
        </div>

        <nav aria-label="Navegación" className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-fg">Navegación</span>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-fg">Más</span>
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Two feeds, two names: subscribing to what I write is not the same
            as receiving an automated edition every day. */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-fg">Seguir</span>
          <a href={feeds.editorial.href} className={linkClass}>
            RSS · artículos
          </a>
          <a href={feeds.noticias.href} className={linkClass}>
            RSS · noticias
          </a>
          <a href={feeds.bitacora.href} className={linkClass}>
            RSS · bitácora
          </a>
          {siteConfig.social.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {item.label}
            </a>
          ))}
        </div>
      </Container>

      <div className="border-t border-border">
        <Container
          size="wide"
          className="flex flex-col gap-2 py-6 text-[0.8125rem] leading-relaxed text-faint sm:flex-row sm:items-baseline sm:justify-between"
        >
          <p>
            © {version.anio} {siteConfig.name}. {siteConfig.author.byline}{" "}
            <a
              href={siteConfig.author.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-[0.18em] transition-colors hover:text-fg"
            >
              {siteConfig.author.profileLabel}
            </a>
          </p>
          <p className="shrink-0">
            Construido en público. Versión del {version.dia}
          </p>
        </Container>
      </div>
    </footer>
  );
}
