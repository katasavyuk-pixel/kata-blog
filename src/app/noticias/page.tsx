import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd, datosDe } from "@/lib/jsonld";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { NoticiaList } from "@/components/content/noticia-row";
import { formatDateShort } from "@/lib/format";
import { getNoticias } from "@/lib/posts";
import { getNovedades } from "@/lib/novedades";
import { mesesPublicados, nombreDeMes, rutaDeMes } from "@/lib/mensual";
import { buildPortada } from "@/lib/noticias-portada";
import { getRadarCadence } from "@/lib/radar";
import { feeds, siteConfig, withOpenGraph } from "@/config/site";
import { ETIQUETA_IA, etiquetaIa } from "@/config/noticias";
import { etiquetaDeEje } from "@/config/taxonomy";
import { Icon } from "@/components/ui/icon";
import { LenteSelector } from "@/components/portada/lente-selector";
import { DESDE_LENTE, LENTES } from "@/lib/impacto";

export const metadata: Metadata = withOpenGraph("/noticias", {
  title: "Noticias",
  description:
    "Noticias de tecnología, negocio, economía y geopolítica explicadas con sus fuentes y un explorador de impacto para pymes.",
  // A page-level `alternates` replaces the layout's, so the feed has to be
  // declared again here — and here it is the news feed that belongs.
  alternates: {
    canonical: "/noticias",
    types: {
      "application/rss+xml": [
        { url: feeds.noticias.href, title: feeds.noticias.title },
      ],
    },
  },
});

const linkClass =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

/**
 * Las Noticias como portada: una noticia protagonista con artículo propio,
 * las novedades breves de la última edición y el resto plegado.
 *
 * Qué se muestra lo decide `buildPortada` (src/lib/noticias-portada.ts) solo
 * con lo publicado. Si hoy no hubo una fuente con texto completo suficiente no
 * se publica un artículo nuevo: la portada conserva el último completo, lo
 * dice, y enseña su fecha real y la de la última edición en vez de aparentar
 * que es de hoy.
 */
export default function NoticiasPage() {
  const portada = buildPortada(getNoticias());
  const { lead, latestEdition, leadIsCurrent, lastEditedAt, archive } = portada;
  const cadence = lastEditedAt ? getRadarCadence(lastEditedAt) : null;
  const novedades = latestEdition
    ? getNovedades(latestEdition.slug, lead?.fuente_url)
    : [];
  const meses = mesesPublicados();

  return (
    <Container className="py-10 sm:py-14">
      <JsonLd
        data={coleccionJsonLd({
          path: "/noticias",
          ...datosDe(metadata),
          items: meses.map((mes) => ({ name: `Novedades de IA de ${nombreDeMes(mes)}`, url: rutaDeMes(mes) })),
        })}
      />
      <header className="max-w-[52ch]">
        <p className="font-sans text-[0.8125rem] font-semibold text-fg">
          {cadence ? (
            <>
              <Icon name={cadence.onSchedule ? "dot" : "half"} className={cadence.onSchedule ? "mr-1.5 text-accent-ink" : "mr-1.5 text-amber"} />
              {cadence.label}
            </>
          ) : (
            "Actualidad"
          )}
        </p>
        <h1 className="mt-3 text-h1">Noticias</h1>
        <p className="mt-4 text-muted">
          Tecnología, negocio, economía y geopolítica explicados con las
          fuentes a la vista. En la noticia protagonista puedes explorar qué
          cambia desde la dirección, las operaciones o la tecnología de una
          pyme.
        </p>
        {/* The disclosure, before any headline: what these texts are and that
            nobody signs them. Same literal as on each piece. */}
        <p className="mt-4 font-sans text-[0.9375rem] text-muted">
          <span className="font-sans text-[0.8125rem]">{ETIQUETA_IA}</span>
          <span aria-hidden className="mx-2 text-faint">·</span>
          <a href="#como-se-hace" className={linkClass}>
            Cómo se hacen
          </a>
        </p>
      </header>

      {lead ? (
        <section aria-labelledby="protagonista" className="mt-10 max-w-5xl border-t border-accent pt-5">
          <p className="font-sans text-[0.8125rem] text-muted">
            {leadIsCurrent ? "Noticia protagonista" : "Último artículo completo"} ·{" "}
            <time dateTime={lead.date}>{formatDateShort(lead.date)}</time>
            {etiquetaIa(lead) ? (
              <>
                <span aria-hidden> · </span>
                <span>{etiquetaIa(lead)}</span>
              </>
            ) : null}
          </p>
          <h2 id="protagonista" className="mt-2 max-w-[40ch] text-h2">
            <Link href={lead.permalink} className="hover:text-accent-ink">
              {lead.title}
            </Link>
          </h2>
          <p className="mt-3 max-w-[66ch] text-[0.9375rem] leading-relaxed text-muted">
            {lead.dek ?? lead.description}
          </p>
          {/* The reader's lens, next to the story it reads (it lived on the
              home until the 2026-10-14 redesign made the home a map). All
              three readings are in the HTML; `data-lente` on <html> picks one
              (src/lib/impacto.ts, globals.css). */}
          {lead.lecturas ? (
            <div className="mt-6 border-t border-border pt-5">
              <LenteSelector />
              <div className="lente-lecturas mt-5">
                {LENTES.map((lente) => (
                  <div key={lente} className="lente-lectura" data-lente-de={lente}>
                    <h3 className="font-sans text-[0.9375rem] font-semibold text-inherit">{DESDE_LENTE[lente]}</h3>
                    <p className="mt-2 leading-relaxed">{lead.lecturas?.[lente]}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {lead.fuente_medio && lead.fuente_url ? (
            <p className="mt-3 font-sans text-[0.8125rem] text-muted">
              Fuente:{" "}
              <a href={lead.fuente_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {lead.fuente_medio}
              </a>
            </p>
          ) : null}
          {!leadIsCurrent && latestEdition ? (
            <p role="note" className="mt-4 border-l-2 border-amber pl-3 text-[0.9375rem] text-muted">
              La última edición no tuvo artículo protagonista porque sus fuentes
              no daban texto completo suficiente para escribirlo con rigor. La
              edición más reciente es del{" "}
              <time dateTime={latestEdition.date}>{formatDateShort(latestEdition.date)}</time>.
            </p>
          ) : null}
          <p className="mt-4 font-sans text-[0.9375rem]">
            <Link href={lead.permalink} className={linkClass}>
              Leer y explorar el impacto
            </Link>
            <span aria-hidden className="mx-2 text-faint">·</span>
            <Link href="/newsletter#suscribirse" className={linkClass}>
              Recibir la próxima
            </Link>
          </p>
        </section>
      ) : null}

      {latestEdition ? (
        <section aria-labelledby="novedades" className="mt-12 max-w-[66ch]">
          <p className="font-sans text-[0.8125rem] text-muted">
            Novedades breves ·{" "}
            <time dateTime={latestEdition.date}>{formatDateShort(latestEdition.date)}</time>
          </p>
          <h2 id="novedades" className="mt-2 text-h2">
            {lead ? "Además, hoy" : latestEdition.title}
          </h2>
          {novedades.length > 0 ? (
            <ul className="mt-4 border-t border-border">
              {novedades.map((novedad) => (
                <li key={novedad.url} className="border-b border-border py-3 font-sans">
                  <p className="font-sans text-[0.8125rem] text-muted">
                    {etiquetaDeEje(novedad.axis)} · {novedad.source}
                  </p>
                  <a
                    href={novedad.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-[0.9375rem] leading-snug text-fg hover:text-accent-ink"
                  >
                    {novedad.titular ?? novedad.title}
                  </a>
                  <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">{novedad.resumen}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
              {latestEdition.dek ?? latestEdition.description}
            </p>
          )}
          <p className="mt-4 font-sans text-[0.9375rem]">
            <Link href={latestEdition.permalink} className={linkClass}>
              Ver la edición completa
            </Link>
            <span aria-hidden className="mx-2 text-faint">·</span>
            <a href={feeds.noticias.href} className={linkClass}>
              Seguir las noticias por RSS
            </a>
          </p>
        </section>
      ) : null}

      {archive.length > 0 ? (
        // Native <details>: collapsed by default, no JS, keyboard and screen
        // reader friendly, and the links stay in the HTML for crawlers.
        <details id="archivo" className="group mt-12 max-w-[66ch]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 border-t border-border py-3 font-sans text-h2 marker:hidden [&::-webkit-details-marker]:hidden">
            <Icon name="chevron-right" className="shrink-0 text-muted transition-transform group-open:rotate-90" />
            Ediciones y artículos anteriores
            <span className="font-sans text-[0.8125rem] text-muted">({archive.length})</span>
          </summary>
          <NoticiaList posts={archive} className="mt-2" />
        </details>
      ) : null}

      {!lead && !latestEdition ? (
        <p className="mt-12 text-muted">Aún no hay noticias publicadas.</p>
      ) : null}

      {meses.length > 0 ? (
        <section aria-labelledby="por-meses" className="mt-12 max-w-[66ch] border-t border-border pt-6">
          <h2 id="por-meses" className="text-h2">
            Por meses
          </h2>
          <p className="mt-3 text-muted">
            Lo de cada semana, revisado antes de enviarse en la newsletter y reunido por meses.
          </p>
          <ul className="mt-3 space-y-2 font-sans text-[0.9375rem]">
            {meses.map((mes) => (
              <li key={mes}>
                <Link href={rutaDeMes(mes)} className={linkClass}>
                  Novedades de IA de {nombreDeMes(mes)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="como-se-hace" aria-labelledby="como-se-hace-titulo" className="mt-12 max-w-[66ch] scroll-mt-8 border-t border-border pt-6">
        <h2 id="como-se-hace-titulo" className="text-h2">
          Cómo se hace
        </h2>
        <p className="mt-3 text-muted">
          Un recolector lee fuentes tecnológicas, empresariales, económicas y
          geopolíticas cada día y guarda los titulares tal cual, sin modelo de
          por medio.
          La noticia protagonista se elige por su relevancia para una pyme o
          un emprendedor, y solo si su fuente aporta texto suficiente. Después,
          un verificador
          comprueba que enlaces, títulos y fuentes coinciden{" "}
          <strong className="text-fg">carácter a carácter</strong> con lo
          recolectado, que el artículo no copia a la fuente y que contiene las
          tres perspectivas del explorador. Si algo no cuadra, no se publica;
          si no hay una fuente suficiente, se conserva el último artículo
          completo con su fecha real.
        </p>
        <p className="mt-3 text-muted">
          Los textos los redacta un modelo de IA a partir de la fuente y{" "}
          <strong className="text-fg">no los reviso antes de publicarse</strong>.
          Por eso llevan la etiqueta «{ETIQUETA_IA}» y no llevan mi firma: no los
          he escrito yo. Cuando leo uno y lo doy por bueno, lo marco como revisado
          y la etiqueta desaparece. Lo que firmo está en{" "}
          <Link href="/blog" className={linkClass}>
            el archivo
          </Link>
          . Si ves un dato mal, escríbeme a{" "}
          <a href={`mailto:${siteConfig.replyEmail}`} className={linkClass}>
            {siteConfig.replyEmail}
          </a>{" "}
          y lo corrijo.
        </p>
      </section>
    </Container>
  );
}
