import Link from "next/link";
import Image from "@/components/ui/imagen";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { conBase } from "@/config/base-path";
import { feeds, footerLinks, navLinks, siteConfig } from "@/config/site";
import { NBI_BLURB, NBI_COLUMNAS, NBI_COPYRIGHT, NBI_LOGO, type EnlaceNbi } from "@/config/nbi-chrome";
import { fechaDeVersion } from "@/lib/version";

function Enlace({ link }: { link: EnlaceNbi }) {
  if (link.href.startsWith("/")) return <Link href={link.href}>{link.label}</Link>;
  return (
    <a
      href={link.href}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noopener noreferrer" : undefined}
    >
      {link.label}
    </a>
  );
}

/**
 * Two parts (26-nov-2026). First the blog's own close: the newsletter form
 * where the page has none, its sections and its feeds, on the light page.
 * Then the footer of ianexora.com, navy, the same on every page of NBI's
 * site (src/config/nbi-chrome.ts). Styles: nbi-chrome.css.
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
    <footer data-site-footer={variant} className="font-sans">
      <div className="nbi-cierre">
        <div className="nbi-wrap nbi-cierre__rejilla">
          <div className="max-w-md">
            <p className="nbi-cierre__nombre">{siteConfig.name}</p>
            <p className="nbi-cierre__texto">{siteConfig.home.titular}</p>
            <p className="nbi-cierre__texto">
              {siteConfig.author.byline}{" "}
              <a href={siteConfig.author.profileUrl} className="nbi-cierre__enlace">
                {siteConfig.author.profileLabel}
              </a>
            </p>
            {signup ? (
              <div className="mt-6">
                <SubscribeForm source="footer" />
              </div>
            ) : null}
          </div>

          <nav aria-label="Secciones del blog" className="nbi-cierre__lista">
            <p className="nbi-cierre__titulo">El blog</p>
            {navLinks.map((link) => (
              <Enlace key={link.href} link={link} />
            ))}
          </nav>

          <div className="nbi-cierre__lista">
            <p className="nbi-cierre__titulo">Más</p>
            {footerLinks.map((link) => (
              <Enlace key={link.href} link={link} />
            ))}
          </div>

          {/* Two feeds, two names: subscribing to what I write is not the same
              as receiving an automated edition every day. */}
          <div className="nbi-cierre__lista">
            <p className="nbi-cierre__titulo">Seguir</p>
            <a href={conBase(feeds.editorial.href)}>RSS · artículos</a>
            <a href={conBase(feeds.noticias.href)}>RSS · noticias</a>
            <a href={conBase(feeds.bitacora.href)}>RSS · bitácora</a>
            {siteConfig.social.map((item) => (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="nbi-pie">
        <div className="nbi-wrap nbi-pie__dentro">
          <div className="nbi-pie__rejilla">
            <div>
              <Image
                src={NBI_LOGO.src}
                alt={NBI_LOGO.alt}
                width={NBI_LOGO.width}
                height={NBI_LOGO.height}
                sizes="150px"
                className="nbi-pie__logo"
              />
              <p className="nbi-pie__texto">{NBI_BLURB}</p>
            </div>
            {NBI_COLUMNAS.map((col, i) => (
              <div key={col.title}>
                <p id={`pie-columna-${i}`} className="nbi-pie__titulo">
                  {col.title}
                </p>
                <ul className="nbi-pie__lista" aria-labelledby={`pie-columna-${i}`}>
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Enlace link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="nbi-pie__base">
            <span>{NBI_COPYRIGHT}</span>
            <span>Versión del blog: {version.dia}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
