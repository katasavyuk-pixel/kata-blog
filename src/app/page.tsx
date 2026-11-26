import type { Metadata } from "next";
import Link from "next/link";
import { FlujoRow } from "@/components/content/flujo-row";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { ANCLA_NEWSLETTER } from "@/components/newsletter/suscribete-link";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/ui/json-ld";
import { NBI_CTA } from "@/config/nbi-chrome";
import { NBI_DIAGNOSTICO, NBI_DIAGNOSTICO_TEXTO, nbiDiagnosticoUrl } from "@/config/nbi-diagnostico";
import { TITULO_HOME, TITULO_HOME_TARJETA, feedAlternates, siteConfig, withOpenGraph } from "@/config/site";
import { ACTIVOS } from "@/lib/catalogo";
import { websiteJsonLd, personJsonLd, organizationJsonLd } from "@/lib/jsonld";
import { esIndexable, getEditoriales } from "@/lib/posts";

/**
 * The home's own canonical. `alternates` is replaced whole per segment, hence
 * the feeds again.
 */
export const metadata: Metadata = withOpenGraph(
  "/",
  {
    title: { absolute: TITULO_HOME },
    description: siteConfig.description,
    // "/" would resolve to …/blog/ (a 308 under the base path): the zone root itself.
    alternates: { ...feedAlternates, canonical: siteConfig.url },
  },
  { title: TITULO_HOME_TARJETA },
);

export const revalidate = 3600;

/**
 * The home of the NBI blog (26-nov-2026, Kata's brief): what a small-business
 * owner finds here, the useful articles, the kits and skills, the newsletter
 * and the call NBI offers. No daily news ticker, no build log, no «about me»
 * up front: those were the personal blog's home (kept in the
 * design/blog-personal-v1 tag, src/components/portada/*).
 *
 * The call to action is ianexora.com's own («Pedir la llamada» → /contacto,
 * NBI-WEB `nav.cta` and footer); nothing new is promised here.
 */
export default function Home() {
  const articulos = getEditoriales().filter(esIndexable).slice(0, 6);
  const recursos = ACTIVOS.slice(0, 6);

  return (
    <>
      <JsonLd data={[websiteJsonLd(), personJsonLd(), organizationJsonLd()]} />

      <section className="border-b border-border bg-surface">
        <Container size="wide" className="py-14 sm:py-20">
          <p className="font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.18em] text-accent-ink">
            {siteConfig.name}
          </p>
          <h1 className="mt-4 max-w-[22ch] text-h1-home">IA aplicada para pymes, con sus números.</h1>
          <p className="mt-5 max-w-[60ch] text-lede text-muted">
            Guías, sistemas y recursos para aplicar IA en un negocio real: qué hace cada cosa, cuánto cuesta y qué
            falló. Escribe {siteConfig.author.firma}.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 font-sans">
            <a href={NBI_CTA.href} className="nbi-boton">
              {NBI_CTA.label}
            </a>
            <Link
              href="/lecturas"
              className="text-[0.9375rem] font-semibold text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
            >
              Leer los artículos
            </Link>
          </div>
        </Container>
      </section>

      <section aria-labelledby="home-articulos">
        <Container size="wide" className="py-14 sm:py-20">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="home-articulos" className="text-h2-section">Artículos útiles</h2>
            <Link href="/lecturas" className="font-sans text-[0.9375rem] text-accent-ink hover:underline">
              Todos los artículos
            </Link>
          </div>
          <ul className="mt-6 border-t border-border">
            {articulos.map((post) => (
              <FlujoRow key={post.slug} post={post} />
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="home-recursos" className="border-y border-border bg-surface">
        <Container size="wide" className="py-14 sm:py-20">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="home-recursos" className="text-h2-section">Kits y skills para descargar</h2>
            <Link href="/marketplace" className="font-sans text-[0.9375rem] text-accent-ink hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recursos.map((item) => (
              <li key={item.id} className="flex flex-col border border-border bg-panel p-6">
                <p className="font-sans text-[0.8125rem] text-faint">{item.format}</p>
                <h3 className="mt-2 text-h3">
                  <Link href={item.href} className="hover:text-accent-ink">
                    {item.title}
                  </Link>
                </h3>
                {item.blurb ? <p className="mt-2 flex-1 font-sans text-[0.9375rem] leading-relaxed text-muted">{item.blurb}</p> : null}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="home-newsletter">
        <Container size="wide" className="grid gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 id="home-newsletter" className="text-h2-section">{siteConfig.newsletter.nombre}</h2>
            <p className="mt-4 max-w-[52ch] text-muted">{siteConfig.newsletter.description}</p>
            <p className="mt-3 max-w-[52ch] font-sans text-[0.9375rem] text-faint">{siteConfig.newsletter.magnet}</p>
          </div>
          <div id={ANCLA_NEWSLETTER}>
            <SubscribeForm source="home" layout="stacked" />
          </div>
        </Container>
      </section>

      <section aria-labelledby="home-llamada" className="border-t border-border bg-surface">
        <Container size="wide" className="py-14 sm:py-16">
          <h2 id="home-llamada" className="text-h2">¿Quieres verlo en tu negocio?</h2>
          <p className="mt-4 max-w-[60ch] text-muted">{NBI_DIAGNOSTICO_TEXTO}</p>
          <div className="mt-7 flex flex-wrap items-center gap-4 font-sans">
            <a href={NBI_CTA.href} className="nbi-boton">
              {NBI_CTA.label}
            </a>
            <a
              href={nbiDiagnosticoUrl("home", "blog-nbi")}
              className="text-[0.9375rem] font-semibold text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
            >
              Qué es el {NBI_DIAGNOSTICO.nombre.toLowerCase()}
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
