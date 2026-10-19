import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/resources/download-button";
import { REGALO } from "@/config/regalo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Gracias", robots: { index: false } };

export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ descarga?: string; error?: string; preview?: string }>;
}) {
  const sp = await searchParams;

  // Two failures that look the same to the reader and are not the same at all.
  // "Caducado" tells someone to sign up again, which is the right advice when
  // the link is old and terrible advice when our database refused the write:
  // they would keep signing up and keep landing here.
  if (sp.error) {
    const falloNuestro = sp.error === "guardado";
    return (
      <Container className="py-16 sm:py-24">
        <div className="mx-auto max-w-[66ch]">
          <h1 className="text-h1">
            {falloNuestro ? "No he podido guardar tu confirmación" : "Enlace no válido"}
          </h1>
          <p className="mt-4 text-muted">
            {falloNuestro ? (
              <>
                El enlace era correcto: el fallo es mío, al guardarlo. Vuelve a pulsarlo
                dentro de un rato y, si sigue igual, escríbeme a{" "}
                <a href={`mailto:${siteConfig.replyEmail}`} className="text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current">
                  {siteConfig.replyEmail}
                </a>{" "}
                y lo confirmo a mano.
              </>
            ) : (
              <>
                El enlace de confirmación ha caducado o ya se usó. Vuelve a suscribirte y
                te envío uno nuevo.
              </>
            )}
          </p>
          <div className="mt-8 font-sans">
            <Button href="/">Volver al inicio</Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-[66ch]">
        <h1 className="text-h1">¡Suscripción confirmada!</h1>
        <p className="mt-4 text-muted">
          Gracias por confirmar. Ya estás dentro: te escribo con lo importante
          de la semana. Como mucho, un correo a la semana.
        </p>
        <p className="mt-4 text-muted">
          Tu regalo, «{REGALO.titulo}», va en el primer correo que te acabo de
          mandar: {REGALO.hoja.titulo.toLowerCase()} para descargar y{" "}
          <Link href={REGALO.ficha.href} className="text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current">
            {REGALO.ficha.titulo.charAt(0).toLowerCase() + REGALO.ficha.titulo.slice(1)}
          </Link>
          , que puedes abrir ya.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 font-sans">
          {sp.descarga ? (
            <DownloadButton
              href={`/api/download?slug=${encodeURIComponent(sp.descarga)}`}
            />
          ) : null}
          <Button href="/blog" variant={sp.descarga ? "secondary" : "primary"}>
            Leer el blog
          </Button>
        </div>
        {sp.preview ? (
          <p className="mt-6 font-sans text-sm text-muted">
            (Modo previsualización: Supabase/Resend aún no configurados.)
          </p>
        ) : null}
      </div>
    </Container>
  );
}
