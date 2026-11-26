"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { navLinks, siteConfig } from "@/config/site";
import { NBI_CTA, NBI_MENU, type EnlaceNbi } from "@/config/nbi-chrome";
import { SuscribeteLink } from "@/components/newsletter/suscribete-link";

/** A link of this zone goes through <Link>; one of ianexora.com is a full page load. */
function Enlace({ link, className, current, onClick }: { link: EnlaceNbi; className: string; current?: boolean; onClick?: () => void }) {
  if (link.href.startsWith("/")) {
    return (
      <Link href={link.href} onClick={onClick} aria-current={current ? "page" : undefined} className={className}>
        {link.label}
      </Link>
    );
  }
  return (
    <a href={link.href} onClick={onClick} className={className}>
      {link.label}
    </a>
  );
}

/**
 * The NBI menu (desktop row) and, on small screens, one <details> menu with
 * the NBI menu, the blog's sections and the call to action. No JS needed to
 * open it; the effect only closes it after a navigation.
 */
export function Nav() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (menuRef.current) menuRef.current.open = false; }, [pathname]);
  const close = () => { if (menuRef.current) menuRef.current.open = false; };
  const isCurrent = (href: string) => href.startsWith("/") && (pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)));

  return (
    <>
      <nav aria-label="Principal" className="nbi-menu hidden lg:flex">
        {NBI_MENU.map((link) => (
          <Enlace
            key={link.label}
            link={link}
            // «Blog» is this whole zone: active on every page of it.
            current={link.href === "/"}
            className="nbi-menu__enlace"
          />
        ))}
      </nav>

      <a href={NBI_CTA.href} className="nbi-boton hidden sm:inline-flex">
        {NBI_CTA.label}
      </a>

      <details
        ref={menuRef}
        className="relative lg:hidden"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuRef.current) {
            menuRef.current.open = false;
            menuRef.current.querySelector("summary")?.focus();
          }
        }}
      >
        <summary
          aria-label="Menú de navegación"
          className="nbi-hamburguesa [&::-webkit-details-marker]:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </summary>
        <div className="nbi-desplegable">
          <p className="nbi-desplegable__titulo">NBI</p>
          {NBI_MENU.filter((l) => l.href !== "/").map((link) => (
            <Enlace key={link.label} link={link} onClick={close} className="nbi-desplegable__enlace" />
          ))}
          <p className="nbi-desplegable__titulo">{siteConfig.shortName}</p>
          {navLinks.map((link) => (
            <Enlace key={link.href} link={link} onClick={close} current={isCurrent(link.href)} className="nbi-desplegable__enlace" />
          ))}
          <SuscribeteLink onClick={close} className="nbi-desplegable__enlace">
            Suscríbete
          </SuscribeteLink>
          <a href={NBI_CTA.href} className="nbi-boton mt-3 justify-center">
            {NBI_CTA.label}
          </a>
        </div>
      </details>
    </>
  );
}

/** The blog's own sections, in a quiet second row under the NBI header (desktop). */
export function SubNav() {
  const pathname = usePathname();
  const isCurrent = (href: string) => href.startsWith("/") && (pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)));
  return (
    <nav aria-label="Secciones del blog" className="nbi-subnav__enlaces hidden lg:flex">
      {navLinks.map((link) => (
        <Enlace key={link.href} link={link} current={isCurrent(link.href)} className="nbi-subnav__enlace" />
      ))}
    </nav>
  );
}
