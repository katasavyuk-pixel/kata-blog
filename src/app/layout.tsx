import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/components/layout/nbi-chrome.css";
import { MotionProvider } from "@/components/motion/motion-provider";
import { SiteChrome } from "@/components/layout/site-chrome";
import { ROBOTS_GOOGLE, TITULO_HOME, feedAlternates, siteConfig } from "@/config/site";
import { SCRIPT_LENTE } from "@/lib/impacto";
import { AnalyticsZona } from "@/components/analytics/analytics-zona";

// The type of ianexora.com (26-nov-2026: the blog takes NBI's identity).
// Instrument Sans for everything (headlines, text, interface) and Instrument
// Serif italic for the occasional accent word, as NBI-WEB app/layout.tsx.
// Both self-hosted by next/font. The previous faces (Newsreader, Schibsted
// Grotesk) are kept in the design/blog-personal-v1 tag for the personal blog.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument-serif",
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
    // The short name keeps titles under 60 characters (tests/seo-snippets).
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  // No title, description or url here: a page that declares no `openGraph`
  // inherits this block whole, and with them it said the author's name and
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
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrains.variable} h-full`}
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
        {/* Cookieless, no-PII page analytics. Script and events go through
            /blog/_m/… so they also work on ianexora.com (src/config/analytics.ts). */}
        {process.env.VERCEL === "1" ? <AnalyticsZona /> : null}
      </body>
    </html>
  );
}
