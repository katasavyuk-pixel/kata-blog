import type { Metadata } from "next";
import { JetBrains_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { MotionProvider } from "@/components/motion/motion-provider";
import { SiteChrome } from "@/components/layout/site-chrome";
import { ROBOTS_GOOGLE, TITULO_HOME, feedAlternates, siteConfig } from "@/config/site";
import { SCRIPT_LENTE } from "@/lib/impacto";

// Three faces, three jobs (DESIGN.md). All variable fonts, self-hosted by
// next/font; the CSS maps them in globals.css (`@theme inline`).
//
// Newsreader: reading text and headlines, drawn for long reading on screen.
// The optical-size axis is what makes the same family work at 19px body and
// a 66px headline (2026-10-14 redesign, chosen by Kata on the canvas).
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

// Schibsted Grotesk: the interface — nav, buttons, forms, labels, card meta.
// A newsroom face, so the interface and the news read as one site.
const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
});

// JetBrains Mono: data and numbers (tabular figures set in globals.css).
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: TITULO_HOME,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  // No title, description or url here: a page that declares no `openGraph`
  // inherits this block whole, and with them it said «Kata Ivanovych» and
  // pointed at the home on every such page (audit of 17-oct-2026). Without
  // them Next fills og:title and og:description from the page's own, and the
  // card image comes from src/app/opengraph-image.tsx. Pages build their
  // blocks with `withOpenGraph` (src/config/site.ts).
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: feedAlternates,
  // Large image previews: Google Discover only shows the big card with
  // `max-image-preview:large`. A page that sets its own `robots` (the
  // automatic news, /gracias…) replaces this whole object, googleBot included.
  robots: { index: true, follow: true, googleBot: ROBOTS_GOOGLE },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={siteConfig.locale}
      className={`${newsreader.variable} ${schibsted.variable} ${jetbrains.variable} h-full`}
      // The lens script below adds `data-lente` to this element before React
      // hydrates. Without this React reports the extra attribute on every page
      // load. It covers this element's own attributes and nothing under it.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-bg text-fg antialiased">
        {/* The reader's lens, before anything it changes is painted: sets
            `data-lente` on <html> and draws nothing (src/lib/impacto.ts). Here
            and not in the page that uses it because a script React renders on
            a client-side navigation never runs; the layout is rendered once. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_LENTE }} />
        <MotionProvider>
          <SiteChrome>{children}</SiteChrome>
        </MotionProvider>
        {/* Cookieless, no-PII page analytics. The Vercel host serves its own script. */}
        {process.env.VERCEL === "1" ? <Analytics /> : null}
      </body>
    </html>
  );
}
