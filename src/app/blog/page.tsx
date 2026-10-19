import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { TITULO_BLOG, coleccionJsonLd, datosDe } from "@/lib/jsonld";
import Link from "next/link";
import { FlujoRow } from "@/components/content/flujo-row";
import { Container } from "@/components/ui/container";
import { ESTANTES, RUTA_POR_ESTANTE, TEMAS } from "@/config/taxonomy";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";
import { facetas, filtrar, hrefDeArchivo, leerFiltro } from "@/lib/archivo";
import { estanteDe, getEditoriales, tienePaginaViva } from "@/lib/posts";

export const metadata: Metadata = withOpenGraph("/blog", {
  // The search title (brief of 17-oct-2026); the H1 and the Blog node keep «Lecturas».
  title: { absolute: `Blog de IA aplicada a negocio · ${siteConfig.name}` },
  description:
    "Lo que escribo: sistemas, guías, reflexiones, notas y las lecciones del curso sobre IA aplicada a un negocio. Filtra por tipo o por tema, o busca. Las noticias van aparte.",
  alternates: { ...feedAlternates, canonical: "/blog" },
});

/**
 * The archive is everything written by hand, as one stream: newest first, each
 * piece saying what it is. The automated news lives at /noticias and is linked
 * from here, never listed: a daily edition outnumbers and buries what is
 * published a few times a month.
 *
 * `?tipo=` and `?tema=` narrow the stream and `?q=` searches it; the rules are
 * in src/lib/archivo.ts. Every combination is the same page to a crawler (the
 * canonical is /blog), and the filters are links, so they work with JavaScript
 * off. The old `?estante=` still filters; `?seccion=` is read by nothing on
 * purpose (`radar` is redirected to /noticias in next.config.ts before it gets
 * here).
 */
type ArchiveSearchParams = Promise<Record<string, string | string[] | undefined>>;

const linkClass =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

const chip = (activa: boolean) =>
  `inline-flex min-h-10 items-center border px-3 font-sans text-[0.875rem] font-semibold ${
    activa ? "border-accent bg-accent text-on-accent" : "border-border text-muted hover:border-chrome hover:text-fg"
  }`;

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: ArchiveSearchParams;
}) {
  const filtro = leerFiltro(await searchParams);
  const archivo = getEditoriales();
  const resultados = filtrar(archivo, filtro, estanteDe);
  const { tipos, temas } = facetas(archivo, filtro, estanteDe);
  const conFiltro = Boolean(filtro.tipo || filtro.tema || filtro.q);

  return (
    <>
      <JsonLd
        data={coleccionJsonLd({
          path: "/blog",
          tipo: "Blog",
          ...datosDe(metadata),
          name: TITULO_BLOG,
          items: archivo.map((p) => ({ name: p.title, url: p.permalink })),
        })}
      />
      <header className="border-b border-border">
        <Container size="wide" className="py-10 sm:py-14">
          <p className="font-sans text-[0.8125rem] font-semibold text-fg">
            {facetas(archivo, { q: "" }, estanteDe)
              .tipos.map((tipo) => ESTANTES[tipo.clave])
              .join(" · ")}
          </p>
          <h1 className="mt-3 max-w-[24ch] text-h1 font-medium">Lecturas</h1>
          <p className="mt-4 max-w-[52ch] text-muted sm:text-[1.1875rem]">
            Guías, reflexiones, notas y casos, firmados: todo sale de lo que pongo en marcha en mi negocio. Las noticias las publica un sistema en automático y van aparte, en{" "}
            <Link href="/noticias" className={linkClass}>
              Noticias
            </Link>
            .
          </p>
        </Container>
      </header>

      <Container size="wide" className="py-8 font-sans sm:py-10">
        <form action="/blog" method="get" role="search" aria-label="Buscar en el archivo" className="grid gap-3 border-b border-border pb-6 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          {filtro.tipo ? <input type="hidden" name="tipo" value={filtro.tipo} /> : null}
          {filtro.tema ? <input type="hidden" name="tema" value={filtro.tema} /> : null}
          <div>
            <label htmlFor="archive-search" className="mb-2 block font-sans text-[0.8125rem] font-semibold text-fg">
              Buscar en el archivo
            </label>
            <input
              id="archive-search"
              type="search"
              name="q"
              defaultValue={filtro.q}
              placeholder="Prueba: agentes, trabajo, costes…"
              className="min-h-11 w-full border border-border bg-bg px-4 text-base text-fg placeholder:text-faint focus:border-accent-ink focus:outline-none"
            />
          </div>
          <button type="submit" className="min-h-11 bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-strong">
            Buscar
          </button>
          {conFiltro ? (
            <Link href={hrefDeArchivo({})} className="inline-flex min-h-11 items-center justify-center px-3 text-sm text-muted underline underline-offset-[0.18em] hover:text-fg">
              Limpiar filtros
            </Link>
          ) : null}
        </form>

        <div className="border-b border-border py-5">
          <nav aria-label="Filtrar por tipo" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 w-12 font-sans text-[0.8125rem] font-semibold text-fg">Tipo</span>
            <Link
              href={hrefDeArchivo({ ...filtro, tipo: undefined })}
              aria-current={!filtro.tipo ? "page" : undefined}
              className={chip(!filtro.tipo)}
            >
              Todo
            </Link>
            {tipos.map((tipo) => (
              <Link
                key={tipo.clave}
                href={hrefDeArchivo({ ...filtro, tipo: tipo.activa ? undefined : tipo.clave })}
                aria-current={tipo.activa ? "page" : undefined}
                className={chip(tipo.activa)}
              >
                {ESTANTES[tipo.clave]}
              </Link>
            ))}
            {/* Not a filter: the news left the archive, so this leaves the page. */}
            <Link
              href="/noticias"
              className="inline-flex min-h-10 items-center px-3 font-sans text-[0.8125rem] font-semibold text-accent-ink underline underline-offset-[0.18em] hover:text-fg sm:ml-auto"
            >
              {ESTANTES.noticias}
            </Link>
          </nav>
          <nav aria-label="Filtrar por tema" className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 w-12 font-sans text-[0.8125rem] font-semibold text-fg">Tema</span>
            <Link
              href={hrefDeArchivo({ ...filtro, tema: undefined })}
              aria-current={!filtro.tema ? "page" : undefined}
              className={chip(!filtro.tema)}
            >
              Todos
            </Link>
            {temas.map((tema) => (
              <Link
                key={tema.clave}
                href={hrefDeArchivo({ ...filtro, tema: tema.activa ? undefined : tema.clave })}
                aria-current={tema.activa ? "page" : undefined}
                className={chip(tema.activa)}
              >
                {TEMAS[tema.clave]}
              </Link>
            ))}
          </nav>
        </div>

        <div id="archivo" className="scroll-mt-8 pt-6">
          <p className="font-sans text-[0.8125rem] font-semibold text-fg" aria-live="polite">
            {resultados.length} {resultados.length === 1 ? "lectura" : "lecturas"}
            {filtro.q ? ` para «${filtro.q}»` : conFiltro ? "" : " en el archivo"}
            {filtro.tipo ? ` · ${ESTANTES[filtro.tipo]}` : ""}
            {filtro.tema ? ` · ${TEMAS[filtro.tema]}` : ""}
          </p>
          {/* The shelf's own page, when the stream is narrowed to one that has it. */}
          {filtro.tipo && tienePaginaViva(filtro.tipo) ? (
            <p className="mt-2 text-[0.9375rem]">
              <Link href={RUTA_POR_ESTANTE[filtro.tipo]} className={linkClass}>
                Ir a {ESTANTES[filtro.tipo]}
              </Link>
            </p>
          ) : null}
          {resultados.length === 0 ? (
            <div className="mt-6 border-y border-border py-8">
              <h2 className="text-h2">No he encontrado esa lectura.</h2>
              <p className="mt-2 text-muted">Prueba otro término o quita un filtro.</p>
              <Link href={hrefDeArchivo({})} className={`mt-4 inline-block ${linkClass}`}>
                Ver todo el archivo
              </Link>
            </div>
          ) : (
            <ol className="mt-4 border-t border-border">
              {resultados.map((post) => (
                <FlujoRow key={post.slug} post={post} />
              ))}
            </ol>
          )}
        </div>
      </Container>
    </>
  );
}
