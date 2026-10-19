import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd, datosDe } from "@/lib/jsonld";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Estado } from "@/components/sistema/estado";
import { Instalar } from "@/components/marketplace/instalar";
import { LogoSkill } from "@/components/marketplace/logo-skill";
import { LOGOS_DE_SKILL } from "@/config/logos";
import { feedAlternates, withOpenGraph } from "@/config/site";
import { ACTIVOS } from "@/lib/catalogo";

export const metadata: Metadata = withOpenGraph("/marketplace", {
  title: "Marketplace de skills para Claude, Codex y otros agentes",
  description:
    "Seis skills en español para Claude, Codex y otros agentes: reclamar facturas, prever la caja, cerrar el trimestre. Cada una con su ficha y cómo se instala.",
  alternates: { ...feedAlternates, canonical: "/marketplace" },
});

const enlace = "font-semibold text-accent-ink underline underline-offset-[0.18em] hover:decoration-2";

/**
 * The marketplace: what a reader can install (2026-10-14, one of the home's
 * four doors). The skills used to be the last section of /sistemas; they get
 * a page of their own, each with its logo (config/logos.ts) and its sheet at
 * /marketplace/<id>. Plugins have a place here and nothing in it yet, which
 * the page says rather than hides.
 */
export default function MarketplacePage() {
  return (
    <Container size="wide" className="py-10 sm:py-16">
      <JsonLd data={coleccionJsonLd({ path: "/marketplace", ...datosDe(metadata), items: ACTIVOS.map((a) => ({ name: a.title, url: a.href })) })} />
      <header className="flex flex-wrap items-end justify-between gap-x-14 gap-y-8">
        <div className="min-w-0 max-w-[42rem] flex-[1_1_30rem]">
          <h1 className="max-w-[20ch] text-h1 font-medium">Skills para Claude, Codex y otros agentes, pensadas para tu negocio</h1>
          <p className="mt-5 text-muted sm:text-[1.25rem]">
            {ACTIVOS.length} skills que se instalan juntas. La primera pregunta por tu negocio una vez: a qué te dedicas, a
            quién vendes y cómo cobras. Las demás leen esas respuestas y se adaptan.
          </p>
        </div>
        <ul aria-label="Las skills" className="grid grid-cols-3 gap-2.5">
          {ACTIVOS.map((activo) => (
            <li key={activo.id}>
              <Link href={activo.href} aria-label={activo.title}>
                <LogoSkill id={activo.id} size={52} />
              </Link>
            </li>
          ))}
        </ul>
      </header>

      {ACTIVOS.length > 0 ? (
        <>
          <section aria-labelledby="instalar" className="mt-12 border border-t-[3px] border-border border-t-accent bg-panel px-6 pb-6 pt-5">
            <h2 id="instalar" className="font-sans text-[1.25rem] font-bold tracking-normal">
              Instálalas todas a la vez
            </h2>
            <div className="mt-4">
              <Instalar />
            </div>
          </section>

          <section aria-labelledby="las-skills" className="mt-16">
            <h2 id="las-skills" className="text-h2-section font-medium">
              Las {ACTIVOS.length}
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ACTIVOS.map((activo) => (
                <li
                  key={activo.id}
                  className="flex flex-col gap-4 border border-t-4 border-border bg-panel p-6"
                  style={{ borderTopColor: LOGOS_DE_SKILL[activo.id]?.color }}
                >
                  <div className="flex items-center gap-4">
                    <LogoSkill id={activo.id} size={60} />
                    <h3 className="font-sans text-[1.1875rem] font-bold leading-tight">
                      <Link href={activo.href} className="hover:text-accent-ink">
                        {activo.title}
                      </Link>
                    </h3>
                  </div>
                  <p className="text-[1.0625rem] leading-relaxed">{activo.queHace}</p>
                  <Estado evidencia={activo.evidencia} variant="pill" />
                  <p className="mt-auto font-sans text-[0.9375rem]">
                    <Link href={activo.href} className={enlace}>
                      Ficha: qué lee, qué escribe y cómo se ha probado
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <section aria-labelledby="plugins" className="mt-16 border border-dashed border-faint px-6 py-5 font-sans">
        <h2 id="plugins" className="text-[1.25rem] font-bold tracking-normal">
          Plugins
        </h2>
        <p className="mt-2 max-w-[44rem] text-[1rem] leading-relaxed text-muted">
          Todavía no hay ninguno publicado aquí. Cuando haya uno, saldrá en esta página con su logo y su ficha, como las
          skills.
        </p>
      </section>

      <p className="mt-12 max-w-[60ch] border-t border-border pt-6 font-sans text-[0.9375rem] leading-relaxed text-muted">
        Los sistemas que uso en mi negocio, con sus números y lo que se rompió, están en{" "}
        <Link href="/sistemas" className={enlace}>
          Sistemas
        </Link>
        . Las herramientas que se usan en el navegador, en{" "}
        <Link href="/herramientas" className={enlace}>
          Herramientas
        </Link>
        .
      </p>
    </Container>
  );
}
