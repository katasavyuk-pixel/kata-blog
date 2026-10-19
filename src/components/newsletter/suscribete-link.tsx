"use client";

import { useEffect, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Every «Suscríbete» lands on the home's form box, not on the hero around it:
 * on a phone the form sits below the fold of the hero, and on the home itself
 * a link to the section the reader is already in did nothing (Kata,
 * 2026-10-17: «el botón de suscríbete no lleva para suscribirse»).
 */
export const ANCLA_NEWSLETTER = "newsletter";

/** Scrolls the form box into view and puts the cursor in its email field. */
function enfocarFormulario(): boolean {
  const caja = document.getElementById(ANCLA_NEWSLETTER);
  const email = caja?.querySelector<HTMLInputElement>('input[type="email"]');
  if (!caja || !email) return false;
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  caja.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "center" });
  email.focus({ preventScroll: true });
  return true;
}

/** The link the header, the menu and the course use. */
export function SuscribeteLink({ onClick, ...props }: Omit<ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();
  return (
    <Link
      {...props}
      href={`/#${ANCLA_NEWSLETTER}`}
      onClick={(event) => {
        onClick?.(event);
        // Already on the home: no navigation to wait for, go straight to the field.
        if (pathname === "/" && enfocarFormulario()) event.preventDefault();
      }}
    />
  );
}

/**
 * Arriving from another page with `#newsletter`: the router scrolls to the
 * box, this puts the cursor in the field. Renders nothing.
 */
export function FocoAlLlegar() {
  useEffect(() => {
    if (window.location.hash === `#${ANCLA_NEWSLETTER}`) enfocarFormulario();
  }, []);
  return null;
}
