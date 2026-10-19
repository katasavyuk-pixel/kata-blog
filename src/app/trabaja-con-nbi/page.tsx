import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { datosDe, paginaJsonLd } from "@/lib/jsonld";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { ContactForm } from "@/components/contact/contact-form";
import { Button } from "@/components/ui/button";
import { NBI_DIAGNOSTICO, nbiDiagnosticoUrl } from "@/config/nbi-diagnostico";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";

export const metadata: Metadata = withOpenGraph("/trabaja-con-nbi", {
  title: "Trabaja con NBI",
  description:
    "¿Quieres un sistema como los del blog en tu negocio? Cuéntame tu caso o mira el diagnóstico de procesos de NBI, con una llamada gratis de 20 minutos.",
  alternates: { ...feedAlternates, canonical: "/trabaja-con-nbi" },
});

/**
 * General contact. The diagnosis NBI offers today lives on ianexora.com; this
 * page points there and keeps the form for any other case. No price here.
 */
export default function WorkWithNbiPage() {
  return (
    <Container className="py-10 sm:py-14">
      <JsonLd data={paginaJsonLd({ path: "/trabaja-con-nbi", ...datosDe(metadata) })} />
      <div className="mx-auto max-w-[66ch]">
        <h1 className="text-h1">Trabaja con NBI</h1>
        <Prose className="mt-6">
          <p>
            Estoy construyendo NBI en público: cada sistema del blog sale de
            algo que implementé de verdad, con sus números y sus errores. Si
            tienes un negocio en marcha y quieres que implemente algo parecido
            en el tuyo, hablemos.
          </p>
          <p>
            Si lo que quieres es que alguien mire cómo funciona tu proceso y te
            diga qué cambio compensa con tus números, eso es el{" "}
            <a href={nbiDiagnosticoUrl("trabaja-con-nbi", "trabaja-con-nbi")}>
              {NBI_DIAGNOSTICO.nombre.toLowerCase()} de NBI
            </a>
            , en ianexora.com. La llamada para ver si encaja es gratis y dura 20
            minutos.
          </p>
          <p>
            Para cualquier otro proceso, cuéntame el caso — qué te está
            costando tiempo — y te digo si tiene sentido y por dónde empezaría.
          </p>
        </Prose>
        <div className="mt-6 font-sans">
          <Button href={nbiDiagnosticoUrl("trabaja-con-nbi", "trabaja-con-nbi-boton")} size="sm">
            Ver el {NBI_DIAGNOSTICO.nombre.toLowerCase()}
          </Button>
        </div>

        <section
          aria-labelledby="trabaja-caso"
          className="mt-12 border-t border-border pt-6 font-sans"
        >
          <h2 id="trabaja-caso" className="text-h2">
            Cuéntame tu caso
          </h2>
          <p className="mt-2 text-[0.9375rem] text-muted">
            Te respondo yo directamente, no un equipo comercial.
          </p>
          <div className="mt-5">
            <ContactForm />
          </div>
          <p className="mt-6 text-[0.9375rem] text-muted">
            También puedes escribir directamente a{" "}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
            >
              {siteConfig.contactEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </Container>
  );
}
