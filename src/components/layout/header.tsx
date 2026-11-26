import Link from "next/link";
import Image from "@/components/ui/imagen";
import { Nav, SubNav } from "./nav";
import { SuscribeteLink } from "@/components/newsletter/suscribete-link";
import { siteConfig } from "@/config/site";
import { NBI_LOGO } from "@/config/nbi-chrome";

/**
 * The header of ianexora.com (26-nov-2026): the NBI logo, NBI's menu with
 * «Blog» active and the one call to action, as on the rest of the site. Under
 * it, a quiet second row with the blog's name and sections, so the reader
 * knows they are in the blog without a second logo competing with NBI's.
 * Styles: src/components/layout/nbi-chrome.css.
 */
export function Header({ variant = "public" }: { variant?: "public" | "internal" }) {
  return (
    <header data-site-header={variant} className="nbi-cabecera">
      <div className="nbi-wrap nbi-cabecera__fila">
        <a href="https://ianexora.com/" className="flex-none" aria-label="NBI — ir al inicio de ianexora.com">
          <Image
            src={NBI_LOGO.src}
            alt={NBI_LOGO.alt}
            width={NBI_LOGO.width}
            height={NBI_LOGO.height}
            sizes="150px"
            priority
            className="nbi-cabecera__logo"
          />
        </a>
        <div className="flex items-center gap-3 lg:gap-8">
          <Nav />
        </div>
      </div>
      <div className="nbi-subnav">
        <div className="nbi-wrap nbi-subnav__fila">
          <Link href="/" className="nbi-subnav__nombre" aria-label={`${siteConfig.name}, inicio`}>
            {siteConfig.shortName}
          </Link>
          <SubNav />
          <SuscribeteLink className="nbi-subnav__suscribete hidden sm:inline">Suscríbete</SuscribeteLink>
        </div>
      </div>
    </header>
  );
}
