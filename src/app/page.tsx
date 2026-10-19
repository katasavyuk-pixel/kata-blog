import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { Portada } from "@/components/portada/portada";
import { JsonLd } from "@/components/ui/json-ld";
import { TITULO_HOME, TITULO_HOME_TARJETA, feedAlternates, siteConfig, withOpenGraph } from "@/config/site";
import { websiteJsonLd, personJsonLd } from "@/lib/jsonld";
import { leerPortada } from "@/lib/portada-lectura";

/**
 * The home's own canonical. Title, description and Open Graph come from the
 * layout; what was missing was this one link, so every `/?utm_…` a share
 * produced was a separate URL to a crawler. `alternates` is replaced whole per
 * segment, hence the feeds again.
 */
export const metadata: Metadata = withOpenGraph(
  "/",
  {
    title: { absolute: TITULO_HOME },
    description: siteConfig.description,
    alternates: { ...feedAlternates, canonical: "/" },
  },
  { title: TITULO_HOME_TARJETA },
);

/**
 * Hourly, so the page stops calling a story «today's» when the news system
 * has gone quiet, without waiting for a deploy. Nothing it renders opens a
 * file: what comes from a post's body is read by the content build.
 */
export const revalidate = 3600;

/**
 * The home is the front page (phase 9, 2026-10-13): the hero with the promise
 * and the one form, then what src/components/portada/portada.tsx lays out
 * from what is published. It replaced a page of shelves once the three zones
 * had content and a first triad existed, and it only stays while they do:
 * tests/portada-home.test.ts fails the build otherwise.
 */
export default function Home() {
  return (
    <>
      <JsonLd data={[websiteJsonLd(), personJsonLd()]} />
      <Portada portada={leerPortada()} cabecera={<Hero />} />
    </>
  );
}
