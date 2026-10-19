import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { NotaCard } from "@/components/content/nota-card";
import { ESTANTE_DESCRIPTIONS, ESTANTES, RUTA_POR_ESTANTE, type Estante } from "@/config/taxonomy";
import { getPostsByEstante } from "@/lib/posts";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd } from "@/lib/jsonld";

const linkClass =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

/**
 * The page of a shelf that has one of its own (/guias, /reflexiones): what the
 * shelf is, and everything on it, newest first.
 *
 * A shelf with nothing on it has no page. It answers 404 instead of rendering
 * an empty listing, the sitemap and /llms.txt leave it out (`zonasConContenido`)
 * and the archive does not link to it: an indexable page that lists nothing is
 * exactly the thin content the rest of this site is built to avoid. The first
 * piece published in that format brings all of it into existence at once.
 */
export function EstantePagina({
  estante,
  kicker,
  unidad,
}: {
  estante: Estante;
  /** What follows the count in the mono line above the title, lower case. */
  kicker: string;
  /** How one piece of this shelf is counted, singular and plural. */
  unidad: [string, string];
}) {
  const posts = getPostsByEstante(estante);
  if (posts.length === 0) notFound();

  return (
    <Container size="wide" className="py-10 sm:py-14">
      <JsonLd
        data={coleccionJsonLd({
          path: RUTA_POR_ESTANTE[estante],
          name: ESTANTES[estante],
          description: ESTANTE_DESCRIPTIONS[estante],
          items: posts.map((p) => ({ name: p.title, url: p.permalink })),
        })}
      />
      <header className="max-w-[52ch]">
        {/* The count is derived from what is published, like every number on
            this site; the listing below needs no heading of its own. */}
        <p className="font-sans text-[0.8125rem] font-semibold text-fg">
          {posts.length} {posts.length === 1 ? unidad[0] : unidad[1]} <span aria-hidden>·</span> {kicker}
        </p>
        <h1 className="mt-3 text-h1">{ESTANTES[estante]}</h1>
        <p className="mt-4 text-muted">{ESTANTE_DESCRIPTIONS[estante]}</p>
      </header>

      <div className="mt-12 grid gap-x-8 gap-y-12 border-t border-border pt-10 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <NotaCard key={post.slug} post={post} heading="h2" />
        ))}
      </div>

      <p className="mt-14 max-w-[60ch] border-t border-border pt-6 font-sans text-[0.9375rem] leading-relaxed text-muted">
        Lo demás que escribo está en{" "}
        <Link href="/blog" className={linkClass}>
          Lecturas
        </Link>
        , y lo que ya funciona en mi negocio, en{" "}
        <Link href="/sistemas" className={linkClass}>
          Sistemas
        </Link>
        .
      </p>
    </Container>
  );
}
