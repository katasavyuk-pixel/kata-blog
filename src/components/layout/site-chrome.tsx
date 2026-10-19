"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ParticleField } from "@/components/effects/particle-field";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { hasOwnSignupForm } from "@/config/site";

/**
 * The bio hub is an intentional exit from the publication shell: people arrive
 * from a social profile looking for a short list, not the whole archive. Keep
 * the decision here so the route has no duplicated header or footer, while
 * every editorial route keeps the existing shell unchanged.
 *
 * Nothing is mounted in front of the content on public routes: the intent
 * wizard, the scroll engine and the particle field left with the cinematic
 * layer (Phase 3), and the assistant dock (Chispa) on 13-Oct-2026 — DESIGN.md
 * rule 1 rules out mascots. The particle field stays on /panel only.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPanel = pathname.startsWith("/panel");

  if (pathname === "/enlaces") {
    return (
      <div className="site-public-surface" data-route={pathname}>
        {children}
      </div>
    );
  }

  return (
    <>
      {/* Hidden until it has keyboard focus (`.site-skip-link` in globals.css). */}
      {isPanel ? null : <a href="#main-content" className="site-skip-link">Saltar al contenido</a>}
      {isPanel ? <ParticleField /> : null}
      <Header variant={isPanel ? "internal" : "public"} />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {isPanel ? (
          children
        ) : (
          <div className="site-public-surface" data-route={pathname}>
            {children}
          </div>
        )}
      </main>
      {/* One signup form per page: the footer's steps aside where the page has
          its own. The list and the reason it is a list live in config/site. */}
      <Footer
        variant={isPanel ? "internal" : "public"}
        signup={!hasOwnSignupForm(pathname)}
      />
    </>
  );
}
