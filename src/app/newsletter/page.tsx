import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { JsonLd } from "@/components/ui/json-ld";
import { faqJsonLd } from "@/lib/jsonld";
import { sentIssues } from "@/lib/newsletter-archive";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";
import { formatDateShort } from "@/lib/format";

export const metadata: Metadata = withOpenGraph("/newsletter", {
  title: "Newsletter",
  description: `${siteConfig.newsletter.description} Aquí están las ediciones ya enviadas, en versión web.`,
  alternates: { ...feedAlternates, canonical: "/newsletter" },
});

/**
 * Questions people actually ask about a newsletter, answered with facts the
 * site already stands behind — cadence (what the welcome sequence states),
 * price (free, no fine print), unsubscribing (one click, RFC 8058), and why
 * the archive is incomplete by design. Visible block AND FAQPage schema say
 * the same words: the checklist in docs/geo-checklist.md forbids marking up
 * anything a reader cannot see on the page.
 */
const NEWSLETTER_FAQ = [
  {
    q: "¿Cada cuánto sale la newsletter?",
    a: "Como mucho, una vez a la semana. Kata escribe lo importante de la semana: un sistema que ha puesto en marcha (qué hace, sus números y qué se rompió) o algo que ha pasado en la IA y qué te cambia. Si no hay nada importante, no hay correo. Las ediciones llegan antes a los suscriptores que a este archivo.",
  },
  {
    q: "¿Cuesta algo suscribirse?",
    a: "No. Es gratis y sin letra pequeña. Puedes darte de baja en cualquier momento.",
  },
  {
    q: "¿Cómo me doy de baja?",
    a: "Con un clic en el enlace de baja que lleva cada email, abajo. La baja es inmediata y no pide confirmación ni razones: dejas de recibir todo. Si algún día quieres volver, suscribirte de nuevo funciona igual.",
  },
  {
    q: "¿Por qué no están todas las ediciones?",
    a: "El archivo solo publica ediciones ya enviadas a los suscriptores, la misma semana que salen. Quien se apunta recibe cada edición antes que nadie — ese es el trato.",
  },
] as const;

/**
 * The public web archive of the newsletter.
 *
 * An indexable archive on our own domain does three jobs a private list
 * cannot: it is the social proof a subscribe form needs ("look at what you
 * get"), it lets a sent edition keep earning readers through search and
 * shares, and it gives new arrivals a taste without asking for an email
 * first — the same "give before you ask" order the home argues for.
 *
 * Only issues with `sent: true` appear — subscribers are promised each
 * edition "antes que nadie", so approved-but-unsent issues stay private.
 * The gate lives in `src/lib/newsletter-archive.ts`, not here: no surface
 * can bypass it by forgetting a filter.
 */
export default function NewsletterArchivePage() {
  const issues = sentIssues;

  const linkClass =
    "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

  return (
    <Container className="py-10 sm:py-14">
      {/* The FAQ is on the page and in the schema with the same words — the
          first real caller of faqJsonLd(), which waited since 2026-08-05 for
          an honest question block instead of structured spam. */}
      <JsonLd data={faqJsonLd([...NEWSLETTER_FAQ])} />
      <header className="max-w-[52ch]">
        <p className="font-sans text-[0.8125rem] font-semibold text-fg">Newsletter</p>
        <h1 className="mt-3 text-h1">Las ediciones, en la web</h1>
        <p className="mt-4 text-muted">
          {siteConfig.newsletter.description} Los suscriptores las reciben
          antes que nadie; aquí quedan archivadas para quien llegue después.
        </p>
        {/* Archive bottom-up: the list is the proof, the form is what the
            proof argues for. One form on the page, at the end of the argument. */}
        <p className="mt-5 font-sans text-[0.9375rem]">
          <Link href="#suscribirse" className={linkClass}>
            Recibirlas antes que nadie
          </Link>
        </p>
      </header>

      {issues.length > 0 ? (
        <section aria-labelledby="ediciones-newsletter" className="mt-12 max-w-[66ch]">
          <h2 id="ediciones-newsletter" className="text-h2">
            Ediciones enviadas
          </h2>
          <ul className="mt-4 border-t border-border font-sans">
            {issues.map((issue) => (
              <li key={issue.issue}>
                <Link
                  href={issue.permalink}
                  className="group grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-border py-4 transition-colors hover:border-accent"
                >
                  <time dateTime={issue.date} className="font-sans text-[0.8125rem] text-muted">
                    {formatDateShort(issue.date)}
                  </time>
                  <span className="min-w-0">
                    <h3 className="font-display text-h3 font-semibold leading-tight text-fg group-hover:text-accent-ink">
                      {issue.title}
                    </h3>
                    <span className="mt-1 block text-[0.9375rem] leading-relaxed text-muted">
                      {issue.preheader}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section aria-labelledby="proximamente-newsletter" className="mt-12 max-w-[66ch] border-t border-border pt-6">
          <h2 id="proximamente-newsletter" className="text-h2">
            Aún no hay ediciones archivadas
          </h2>
          <p className="mt-3 text-muted">
            La primera va camino de los buzones. Aquí quedará en cuanto se
            envíe — pero suscribirte sigue siendo la única forma de leerla{" "}
            <strong className="text-fg">antes que nadie</strong>.
          </p>
        </section>
      )}

      <section aria-labelledby="preguntas-newsletter" className="mt-12 max-w-[66ch] scroll-mt-20">
        <h2 id="preguntas-newsletter" className="text-h2">
          Preguntas frecuentes
        </h2>
        <dl className="mt-4 border-t border-border">
          {NEWSLETTER_FAQ.map((item) => (
            <div key={item.q} className="border-b border-border py-5">
              <dt className="font-sans text-base font-semibold text-fg">{item.q}</dt>
              <dd className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        id="suscribirse"
        aria-labelledby="suscribirse-titulo"
        className="mt-12 max-w-[66ch] scroll-mt-20 border-t border-accent pt-6 font-sans"
      >
        <h2 id="suscribirse-titulo" className="text-h2">
          Recibir las ediciones
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
          {siteConfig.newsletter.regalo} {siteConfig.newsletter.magnet}
        </p>
        <div className="mt-5 max-w-xl">
          <SubscribeForm source="newsletter-archive" />
        </div>
      </section>
    </Container>
  );
}
