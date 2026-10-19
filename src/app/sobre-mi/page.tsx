import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";
import { getEditoriales } from "@/lib/posts";
import { formatDate, weekNumberSince } from "@/lib/format";
import Image from "next/image";
import { RETRATO } from "@/components/ui/retrato";
import { JsonLd } from "@/components/ui/json-ld";
import { datosDe, perfilJsonLd } from "@/lib/jsonld";
import { TarjetaLinkedIn } from "@/components/linkedin/tarjeta-linkedin";
import { PUBLICACIONES_LINKEDIN } from "@/config/linkedin";

export const metadata: Metadata = withOpenGraph("/sobre-mi", {
  title: "Sobre mí",
  description: `Quién está detrás de ${siteConfig.name}: ${siteConfig.author.alternateName}, que construye NBI y documenta cada sistema de IA que pone en marcha, con sus números y sus fallos.`,
  alternates: { ...feedAlternates, canonical: "/sobre-mi" },
});

/**
 * "El viaje" — identity in one line, honest credential, mission, newsletter
 * CTA (Barry/Welsh about structure; never a chronological biography).
 *
 * Since 2026-10-14 this is also where the promise and the portrait live: they
 * opened the home until Kata found it too much about him. The home is now the
 * map of what a reader can do; who makes it, and what he promises, is here.
 *
 * The line under the title carries the two counts the page can source
 * (siteConfig.journey.start and the published archive); the subscriber
 * count pills went with the badge component — a number below the threshold
 * rendered a slogan instead, which is the opposite of a figure.
 */
export default function AboutPage() {
  const week = weekNumberSince(siteConfig.journey.start);
  const postCount = getEditoriales().length;

  return (
    <Container className="py-10 sm:py-14">
      {/* The page about the person is where the Person is declared; articles point at it by @id. */}
      <JsonLd data={perfilJsonLd({ path: "/sobre-mi", ...datosDe(metadata) })} />
      <div className="mx-auto max-w-[66ch]">
        <h1 className="text-h1 font-medium">Sobre mí</h1>
        <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-6">
          {/* The face that is on every channel thumbnail, after the h1. */}
          <figure className="w-40 shrink-0 sm:w-56">
            <Image
              src={RETRATO.src}
              width={RETRATO.width}
              height={RETRATO.height}
              alt={RETRATO.alt}
              sizes="224px"
              className="h-auto w-full border border-border"
            />
          </figure>
          {/* The promise the home used to open with. */}
          <p className="min-w-0 flex-[1_1_18rem] text-lede font-medium">{siteConfig.tagline}</p>
        </div>
        <p className="mt-6 font-sans text-[0.9375rem] text-muted">
          Semana {week} construyendo en público, {postCount} {postCount === 1 ? "artículo" : "artículos"} desde el{" "}
          <time dateTime={siteConfig.journey.start}>{formatDate(siteConfig.journey.start)}</time>.
        </p>
        <Prose className="mt-8">
          <p>
            Soy {siteConfig.author.name}. {siteConfig.author.bio}
          </p>
          <h2 id="por-que">Por qué hago esto</h2>
          <p>
            Hasta finales de mayo trabajaba de noche en un almacén. Antes,
            cuatro años de camarero. No vengo de la tecnología: desde 2024
            aprendo IA por mi cuenta. Nací en Ucrania, llegué a España con tres
            años y vivo en Irun.
          </p>
          <p>
            Lo que me cambió fue darle la vuelta a la pregunta. Dejé de
            preguntar qué puedo hacer con una herramienta y empecé a preguntar
            qué proceso le quita horas a alguien. En mayo lo dejé todo para
            construir sistemas de IA en un negocio real, buscando libertad de
            tiempo y tranquilidad para mí y para mi familia.
          </p>
          <p>
            Lo cuento en público porque casi todo lo que se publica sobre IA es
            la demo, sin factura y sin fallos. Yo enseño lo que cuesta y lo que
            se rompe: cada sistema de la biblioteca sale de algo que implementé
            de verdad, en NBI o en este mismo blog. Y contarlo me obliga a
            hacerlo bien. Lo cuento entero en{" "}
            <Link href="/blog/por-que-hago-esto">Por qué hago esto</Link>.
          </p>
          <p>
            Esto es para ti si diriges un negocio y quieres aplicar
            IA sin fiarte de una demo. No lo es si buscas atajos o fórmulas:
            aquí hay lo que funciona, lo que se rompió y cómo está montado.
          </p>
          <p>
            Los sistemas los grabo mientras los monto: están en <Link href="/videos">vídeos</Link>, con su
            artículo al lado cuando lo tienen.
          </p>
          <p>
            {siteConfig.author.byline}{" "}
            <a href={siteConfig.author.profileUrl}>
              {siteConfig.author.profileLabel}
            </a>
            .
          </p>
          <p>
            Si quieres que implemente algo parecido en tu negocio,{" "}
            <Link href="/trabaja-con-nbi">hablemos</Link>.
          </p>
        </Prose>

        {PUBLICACIONES_LINKEDIN.length > 0 ? (
          <section aria-labelledby="sobre-mi-linkedin" className="mt-12 border-t border-border pt-6">
            <h2 id="sobre-mi-linkedin" className="text-h2">
              Lo que escribo en LinkedIn
            </h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {PUBLICACIONES_LINKEDIN.map((publicacion) => (
                <li key={publicacion.id} className="min-w-0">
                  <TarjetaLinkedIn publicacion={publicacion} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="sobre-mi-newsletter" className="mt-12 border-t border-border pt-6 font-sans">
          <h2 id="sobre-mi-newsletter" className="text-h2">
            Sigue el viaje de cerca
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            {siteConfig.newsletter.description}
          </p>
          <div className="mt-4 max-w-xl">
            <SubscribeForm source="about" />
          </div>
        </section>
      </div>
    </Container>
  );
}
