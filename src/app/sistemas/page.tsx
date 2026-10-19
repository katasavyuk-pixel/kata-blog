import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd, datosDe } from "@/lib/jsonld";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Ficha } from "@/components/sistema/ficha";
import { SistemaCard } from "@/components/content/sistema-card";
import { WorkWithNbiCta } from "@/components/blog/work-with-nbi-cta";
import { LIBRARY_ITEMS } from "@/config/library";
import { resolveLibraryItem, type ResolvedLibraryItem } from "@/lib/library";
import { ESTANTE_DESCRIPTIONS, ESTANTES } from "@/config/taxonomy";
import { getPostsByEstante } from "@/lib/posts";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";
import { SectionHead } from "@/components/ui/section-head";

export const metadata: Metadata = withOpenGraph("/sistemas", {
  // The search title (brief of 17-oct-2026); the H1 stays the shelf's name.
  title: { absolute: `Sistemas de IA con sus números y sus fallos · ${siteConfig.name}` },
  description:
    "Los sistemas de IA que ya funcionan en mi negocio, con sus números y lo que se rompió, y seis skills en español, para Claude, Codex y otros agentes, para el trabajo de oficina de un negocio.",
  alternates: { ...feedAlternates, canonical: "/sistemas" },
});

const linkClass =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

/**
 * The systems I run, documented: the ones with an article first (posts on
 * the `sistemas` shelf, each with its ficha when config/library has one), then
 * the ones that run or are being built without an article yet. Since
 * 2026-10-14 it is a shelf of «Lecturas», not a door of its own: what a reader
 * can install moved to /marketplace, and the tools to /herramientas.
 */
export default function SistemasPage() {
  const posts = getPostsByEstante("sistemas");

  // Every item is resolved, not only the ones shown: `resolveLibraryItem`
  // throws on a slug that is missing or draft, and this is the statically
  // built page, so a broken item still fails the build — including the ones
  // /recursos renders at request time.
  const items = LIBRARY_ITEMS.map(resolveLibraryItem).filter(
    (item): item is ResolvedLibraryItem => item !== null && item.listedOn === "sistemas",
  );
  const bySlug = new Map(items.filter((item) => item.slug).map((item) => [item.slug!, item]));
  // Its article is in the list above: same system, listed once. What can be
  // installed has its own section below, and its own page.
  const pending = items.filter(
    (item) => !item.activo && !(item.slug && posts.some((post) => post.slug === item.slug)),
  );

  return (
    <Container size="wide" className="py-10 sm:py-14">
      <JsonLd
        data={coleccionJsonLd({
          path: "/sistemas",
          ...datosDe(metadata),
          name: ESTANTES.sistemas,
          items: posts.map((p) => ({ name: p.title, url: p.permalink })),
        })}
      />
      <header className="max-w-[52ch]">
        <h1 className="text-h1 font-medium">{ESTANTES.sistemas}</h1>
        <p className="mt-4 text-muted">
          {ESTANTE_DESCRIPTIONS.sistemas} Los que ya tienen artículo van
          primero; lo que sigue en el taller aparece con su fecha.
        </p>
      </header>

      {posts.length > 0 ? (
        <section className="mt-12" aria-labelledby="sistemas-documentados">
          <SectionHead
            id="sistemas-documentados"
            title="Con su artículo"
            count={{ valor: posts.length, etiqueta: posts.length === 1 ? "sistema documentado" : "sistemas documentados" }}
          />
          <div className="mt-10 grid gap-x-10 gap-y-14 lg:grid-cols-2">
            {posts.map((post) => {
              const item = bySlug.get(post.slug);
              return item ? (
                <Ficha key={post.slug} item={item} post={post} />
              ) : (
                <SistemaCard key={post.slug} post={post} />
              );
            })}
          </div>
        </section>
      ) : null}

      {pending.length > 0 ? (
        <section className="mt-20" aria-labelledby="sistemas-sin-articulo">
          <SectionHead
            id="sistemas-sin-articulo"
            title="Aún sin artículo"
            count={{ valor: pending.length, etiqueta: pending.length === 1 ? "en marcha o en el taller" : "en marcha o en el taller" }}
          />
          <div className="mt-10 grid gap-x-10 gap-y-12 lg:grid-cols-2">
            {pending.map((item) => (
              <Ficha key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {/* The skills left this page for /marketplace (2026-10-14). The anchor
          stays, so an old «/sistemas#skills» lands on the pointer. */}
      <p id="skills" className="mt-16 max-w-[60ch] scroll-mt-8 font-sans text-[0.9375rem] leading-relaxed text-muted">
        Lo que se instala está en el{" "}
        <Link href="/marketplace" className={linkClass}>
          marketplace
        </Link>
        .
      </p>

      <p className="mt-14 max-w-[60ch] border-t border-border pt-6 font-sans text-[0.9375rem] leading-relaxed text-muted">
        El curso, la calculadora de costes y las herramientas están en{" "}
        <Link href="/herramientas" className={linkClass}>
          Herramientas
        </Link>
        . Lo demás que escribo, en{" "}
        <Link href="/blog" className={linkClass}>
          el archivo
        </Link>
        .
      </p>

      <WorkWithNbiCta />
    </Container>
  );
}
