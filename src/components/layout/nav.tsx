"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { navLinks } from "@/config/site";
import { SuscribeteLink } from "@/components/newsletter/suscribete-link";

const linkBase =
  "inline-flex min-h-11 items-center px-3 text-sm text-muted transition-colors hover:text-fg aria-[current=page]:text-fg aria-[current=page]:underline aria-[current=page]:decoration-accent aria-[current=page]:underline-offset-[0.4em]";

/** Primary navigation: inline links on desktop, a no-JS <details> menu on mobile. */
export function Nav({ variant = "public" }: { variant?: "public" | "internal" }) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (menuRef.current) menuRef.current.open = false; }, [pathname]);
  const isCurrent = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  const close = () => { if (menuRef.current) menuRef.current.open = false; };
  return (
    <>
      <nav
        aria-label="Navegación principal"
        className={variant === "public" ? "hidden items-center lg:flex" : "hidden items-center sm:flex"}
      >
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} onClick={close} aria-current={isCurrent(link.href) ? "page" : undefined} className={linkBase}>
            {link.label}
          </Link>
        ))}
      </nav>

      <details ref={menuRef} className={variant === "public" ? "relative lg:hidden" : "relative sm:hidden"} onKeyDown={(event) => { if (event.key === "Escape" && menuRef.current) { menuRef.current.open = false; menuRef.current.querySelector("summary")?.focus(); } }}>
        <summary
          aria-label="Menú de navegación"
          className="flex h-11 w-11 cursor-pointer list-none items-center justify-center border border-border text-fg [&::-webkit-details-marker]:hidden"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </summary>
        <div className="absolute right-0 top-12 z-50 flex w-56 flex-col border border-border bg-bg p-2 shadow-card-hover">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={close} aria-current={isCurrent(link.href) ? "page" : undefined} className={linkBase}>
              {link.label}
            </Link>
          ))}
          <SuscribeteLink
            onClick={close}
            className="mt-1 inline-flex min-h-11 items-center border-t border-border px-3 text-sm text-accent-ink"
          >
            Suscríbete
          </SuscribeteLink>
        </div>
      </details>
    </>
  );
}
