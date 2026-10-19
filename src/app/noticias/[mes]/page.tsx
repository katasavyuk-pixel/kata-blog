import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { JsonLd } from "@/components/ui/json-ld";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import {
  mesesPublicados,
  metadataDeMes,
  nombreDeMes,
  rutaDeMes,
  semanasDelMes,
  tituloDeMes,
} from "@/lib/mensual";

export function generateStaticParams() {
  return mesesPublicados().map((mes) => ({ mes }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mes: string }>;
}): Promise<Metadata> {
  const { mes } = await params;
  return metadataDeMes(mes) ?? {};
}

const linkClass =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

/**
 * A month of news, on one page.
 *
 * Unlike the daily editions, everything here went through a person: each block
 * is the news section of a weekly edition that was sent, exactly as the
 * subscribers read it (src/lib/mensual.ts). That is what lets this page be
 * indexed while the daily ones are not. A month with no sent weekly edition has
 * no page: an empty shelf is a 404, not a promise.
 */
export default async function NoticiasDelMesPage({
  params,
}: {
  params: Promise<{ mes: string }>;
}) {
  const { mes } = await params;
  const nombre = nombreDeMes(mes);
  const semanas = nombre ? semanasDelMes(mes) : [];
  if (!nombre || semanas.length === 0) notFound();

  const otrosMeses = mesesPublicados().filter((otro) => otro !== mes);

  return (
    <Container className="py-10 sm:py-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Noticias", path: "/noticias" },
          { name: `Novedades de IA de ${nombre}`, path: rutaDeMes(mes) },
        ])}
      />

      <div className="mx-auto max-w-[66ch]">
        <header>
          <p className="font-sans text-[0.8125rem] font-semibold text-fg">
            <Link href="/noticias" className="hover:text-accent-ink">
              Noticias
            </Link>
          </p>
          <h1 className="mt-3 text-h1">{tituloDeMes(nombre)}</h1>
          <p className="mt-4 text-muted">
            Las noticias de cada semana, tal como salieron en la newsletter: leídas antes de
            enviarse y con el enlace a su fuente. La página crece con cada edición del mes.
          </p>
        </header>

        {semanas.map((semana) => (
          <section
            key={semana.issue}
            aria-labelledby={`semana-${semana.issue}`}
            className="mt-12 border-t border-border pt-6"
          >
            <h2 id={`semana-${semana.issue}`} className="text-h2">
              Semana {semana.rango}
            </h2>
            <Prose className="mt-4">
              {/* Same trust level as the edition's own page: versioned content
                  from this repo, as it was mailed. */}
              <div dangerouslySetInnerHTML={{ __html: semana.noticiasHtml }} />
            </Prose>
            <p className="mt-4 font-sans text-[0.9375rem]">
              <Link href={semana.permalink} className={linkClass}>
                Leer la edición entera
              </Link>
            </p>
          </section>
        ))}

        <section aria-labelledby="mas-noticias" className="mt-12 border-t border-border pt-6 font-sans">
          <h2 id="mas-noticias" className="text-h2">
            Seguir leyendo
          </h2>
          <ul className="mt-3 space-y-2 text-[0.9375rem]">
            {otrosMeses.map((otro) => (
              <li key={otro}>
                <Link href={rutaDeMes(otro)} className={linkClass}>
                  Novedades de IA de {nombreDeMes(otro)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/noticias" className={linkClass}>
                Las noticias de hoy
              </Link>
            </li>
            <li>
              <Link href="/newsletter#suscribirse" className={linkClass}>
                Recibir la edición de cada semana
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </Container>
  );
}
