import { Mural } from "@/components/home/mural";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { ANCLA_NEWSLETTER, FocoAlLlegar } from "@/components/newsletter/suscribete-link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";
import { columnasDelMural } from "@/lib/mural";
import { leerPortada } from "@/lib/portada-lectura";

/**
 * What the reader can do here, the one form, and beside them the mural: the
 * day's news, the skills and the build log drifting past (2026-10-15, Kata
 * chose «D» on the canvas). The h1 is still the first thing on the page for a
 * reader and for a crawler; four withdrawn redesigns put something before it
 * and every one of them was removed. The mural comes after it in the
 * document, beside it on screen.
 *
 * 2026-10-14: the h1 is the home's own (`siteConfig.home.titular`), about the
 * reader; the promise and the portrait moved to /sobre-mi.
 *
 * `id="newsletter"` lives on the form box, not on the section: the header, the
 * nav and the course all link to `/#newsletter`, and on a phone the section's
 * top is the h1, with the form below the fold. This is the only form on the
 * home (the footer drops its own here via `hasOwnSignupForm`).
 */
export function Hero() {
  const columnas = columnasDelMural(leerPortada());

  return (
    <section aria-labelledby="home-promise" className="overflow-hidden border-b border-border">
      <Container size="wide" className="flex flex-wrap items-center gap-x-14 gap-y-10 py-10 sm:py-14">
        <div className="min-w-0 flex-[1_1_26rem]">
          <h1 id="home-promise" className="max-w-[18ch] text-h1-home font-medium tracking-[-0.02em]">
            {siteConfig.home.titular}
          </h1>
          <p className="mt-5 max-w-[36rem] text-muted sm:text-[1.25rem]">{siteConfig.home.subtitulo}</p>

          <div id={ANCLA_NEWSLETTER} className="mt-8 max-w-[30rem] border border-t-[3px] border-border border-t-accent bg-panel px-5 pb-5 pt-4 font-sans">
            <FocoAlLlegar />
            <h2 className="text-[1.0625rem] font-bold tracking-normal">{siteConfig.newsletter.title}</h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{siteConfig.newsletter.description}</p>
            <div className="mt-4">
              <SubscribeForm source="home" layout="inline" />
            </div>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
              {siteConfig.newsletter.regalo} {siteConfig.newsletter.magnet}
            </p>
          </div>
        </div>

        {columnas.length > 0 ? (
          <div className="min-w-0 flex-[1_1_34rem]">
            <Mural columnas={columnas} />
          </div>
        ) : null}
      </Container>
    </section>
  );
}
