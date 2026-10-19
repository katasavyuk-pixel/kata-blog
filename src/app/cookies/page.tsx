import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { datosDe, paginaJsonLd } from "@/lib/jsonld";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";

export const metadata: Metadata = withOpenGraph("/cookies", {
  title: "Política de cookies",
  description:
    "kata.ianexora.com no usa cookies de medición ni de publicidad: qué guarda tu navegador, solo cuando lo pides, y qué pasa al reproducir un vídeo.",
  alternates: { ...feedAlternates, canonical: "/cookies" },
});

export default function CookiesPage() {
  return (
    <Container className="py-10 sm:py-14">
      <JsonLd data={paginaJsonLd({ path: "/cookies", ...datosDe(metadata) })} />
      <div className="mx-auto max-w-[66ch]">
        <h1 className="text-h1">Política de cookies</h1>
        <Prose className="mt-6">
          <h2>Qué utiliza esta web</h2>
          <p>
            Esta web no usa cookies de medición ni de publicidad, y por eso no te pide permiso con
            un aviso. Las visitas se cuentan con Vercel Web Analytics,
            que funciona sin cookies y sin guardar nada en tu navegador.
          </p>
          <h2>Lo que sí guarda tu navegador, y solo porque lo pides</h2>
          <p>
            Si marcas lecciones del curso como hechas, eliges una lente de lectura en las noticias o
            usas alguna herramienta que guarda tu lista, tu navegador lo recuerda en su
            almacenamiento local. No sale de tu dispositivo y lo puedes borrar cuando quieras desde
            el navegador.
          </p>
          <h2>Formulario de suscripción</h2>
          <p>
            El formulario usa Cloudflare Turnstile para frenar a los bots. Es una medida de seguridad
            del servicio que pides al suscribirte, no una medición.
          </p>
          <h2>Vídeos de YouTube</h2>
          <p>
            Los vídeos se ven con el reproductor de YouTube en su modo de privacidad reforzada
            (youtube-nocookie.com). Hasta que pulsas el botón de reproducir no se carga nada de
            YouTube: solo una imagen fija del vídeo. Al pulsarlo, YouTube puede guardar datos en tu
            navegador según su propia política.
          </p>
          <p>
            Para cualquier consulta, escribe a{" "}
            <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
          </p>
        </Prose>
      </div>
    </Container>
  );
}
