import type { Metadata } from "next";
import { PuenteNbi } from "@/components/blog/puente-nbi";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd, datosDe } from "@/lib/jsonld";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { REGALO } from "@/config/regalo";
import { Estado } from "@/components/sistema/estado";
import { getPublishedResources } from "@/lib/resources";
import { resolveLibraryItem, type ResolvedLibraryItem } from "@/lib/library";
import { LIBRARY_ITEMS, libraryStatus } from "@/config/library";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";

// The resource list comes from Supabase and must reflect the DB on every request.
// Without this the route prerenders at build time: `getPublishedResources()` bails
// out to [] when the Supabase envs are missing, so it never reaches `cookies()` and
// nothing opts the segment out of static rendering — the empty state gets baked in.
export const dynamic = "force-dynamic";

export const metadata: Metadata = withOpenGraph("/herramientas", {
  title: "Recursos",
  description:
    "Herramientas gratuitas, plantillas y prompts descargables que uso en mi negocio: el curso interactivo de IA, la calculadora de costes, el planificador No me da la vida, el prompt de auditoría GEO y la plantilla de datos de emails logísticos.",
  alternates: { ...feedAlternates, canonical: "/herramientas" },
});

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ need_email?: string; error?: string; slug?: string }>;
}) {
  const [resources, sp] = await Promise.all([
    getPublishedResources(),
    searchParams,
  ]);

  // /api/download bounces here when a download needs a confirmed email. Until
  // now the parameter was ignored and the reader landed on a page that said
  // nothing about why they had been moved — a dead end that reads as a bug.
  const blocked = sp.need_email
    ? resources.find((r) => r.slug === sp.need_email)
    : undefined;

  // /api/download also bounces here when the row is published but Storage has
  // no object behind it. The reader did everything right and still has nothing,
  // so the one thing this page must not do is act as if they had not asked.
  const roto =
    sp.error === "descarga"
      ? (resources.find((r) => r.slug === sp.slug)?.title ?? "el archivo")
      : undefined;

  // What config/library sends here (`listedOn: "recursos"`): the course and the
  // calculator, which /sistemas listed until it became the index of systems.
  // The planner is the third such item and keeps its hand-written card below,
  // so it is left out here rather than shown twice.
  const gratuitas = LIBRARY_ITEMS.filter(
    (item) => item.listedOn === "recursos" && item.id !== "no-me-da-la-vida",
  )
    .map(resolveLibraryItem)
    .filter((item): item is ResolvedLibraryItem => item !== null);

  // Derived, not hand-written: `assertEvidencia` fails the build when an ETA
  // expires, so this list cannot quietly become a set of stale promises. Only
  // items this page owns (`listedOn`): a system in the workshop belongs to
  // /sistemas, and one promise should not live on two pages.
  const enPreparacion = LIBRARY_ITEMS.filter(
    (item) => item.listedOn === "recursos" && libraryStatus(item) === "en-construccion",
  );

  const linkClass =
    "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";
  const button =
    "mt-4 inline-flex min-h-10 w-fit items-center rounded-sm bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong";

  return (
    <Container className="py-10 sm:py-14">
      <JsonLd
        data={coleccionJsonLd({
          path: "/herramientas",
          ...datosDe(metadata),
          items: [
            { name: "No me da la vida", url: "/herramientas/no-me-da-la-vida" },
            { name: "Tu ficha para la IA", url: REGALO.ficha.href },
            ...gratuitas.map((item) => ({ name: item.title, url: item.href ?? "/herramientas" })),
          ],
        })}
      />
      <header className="max-w-[52ch]">
        <h1 className="text-h1">Herramientas que puedes usar hoy</h1>
        <p className="mt-4 text-muted">
          Lo que uso en mi negocio, en formato que puedes abrir y copiar. Te
          los mando por correo: es una sola lista y te das de baja en un clic.
        </p>
      </header>

      <section className="mt-12 max-w-3xl font-sans" aria-labelledby="herramientas-gratuitas">
        <p className="font-sans text-[0.8125rem] font-semibold text-accent-ink">Herramientas gratuitas</p>
        <h2 id="herramientas-gratuitas" className="mt-2 text-h2">
          Ábrelas y úsalas ahora
        </h2>
        <div className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2">
          <article className="flex h-full flex-col border-t border-border pt-4">
            <p className="font-sans text-[0.8125rem] text-muted">Planificador · sin registro</p>
            <h3 className="mt-2 font-display text-h3 font-semibold leading-tight text-fg">No me da la vida</h3>
            <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-muted">
              Convierte una lista que abruma en un plan de 25 minutos. Añade
              tareas, reserva lo que no cabe y guarda el avance en este
              navegador.
            </p>
            <Link href="/herramientas/no-me-da-la-vida" className={button}>
              Usar la herramienta gratis
            </Link>
            <p className="mt-3 text-xs text-faint">Gratis para tu equipo · sin email y sin cuenta</p>
          </article>
          <article className="flex h-full flex-col border-t border-border pt-4">
            <p className="font-sans text-[0.8125rem] text-muted">Plantilla · sin registro</p>
            <h3 className="mt-2 font-display text-h3 font-semibold leading-tight text-fg">{REGALO.ficha.titulo}</h3>
            <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-muted">
              Rellénala una vez y pégala en ChatGPT, Claude o Gemini: desde ahí te
              responden sabiendo quién eres y cómo trabajas, en vez de empezar de cero.
            </p>
            <Link href={REGALO.ficha.href} className={button}>
              Abrir la ficha
            </Link>
            <p className="mt-3 text-xs text-faint">Gratis · sin email y sin cuenta</p>
          </article>
          {gratuitas.map((item) => (
            <article key={item.id} className="flex h-full flex-col border-t border-border pt-4">
              <p className="font-sans text-[0.8125rem] text-muted">{item.format}</p>
              <h3 className="mt-2 font-display text-h3 font-semibold leading-tight text-fg">{item.title}</h3>
              <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-muted">{item.blurb}</p>
              <Link href={item.href ?? "/herramientas"} className={button}>
                Abrir
              </Link>
              <p className="mt-3 font-sans text-[0.8125rem] text-muted">
                <Estado evidencia={item.evidencia} />
              </p>
            </article>
          ))}
        </div>
      </section>

      {roto ? (
        <section className="mt-10 max-w-2xl border-t border-accent pt-5 font-sans">
          <h2 className="text-h3">No he podido servirte «{roto}»</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            Tu dirección está confirmada y el enlace era correcto: el fallo está
            en mi lado, al ir a buscar el archivo. Escríbeme a{" "}
            <a href={`mailto:${siteConfig.replyEmail}`} className={linkClass}>
              {siteConfig.replyEmail}
            </a>{" "}
            y te lo mando yo mismo, hoy.
          </p>
        </section>
      ) : null}

      {blocked ? (
        <section className="mt-10 max-w-2xl border-t border-accent pt-5 font-sans">
          <h2 className="text-h3">Confirma tu email para bajar «{blocked.title}»</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            El enlace es válido, pero necesito una dirección confirmada antes de
            servir el archivo. Déjala aquí y te llega en un minuto.
          </p>
          <div className="mt-5">
            <SubscribeForm source="recursos" resource={blocked.slug} />
          </div>
        </section>
      ) : null}

      {resources.length > 0 ? (
        <section className="mt-14 max-w-3xl font-sans" aria-labelledby="descargables">
          <p className="font-sans text-[0.8125rem] font-semibold text-accent-ink">Descargables</p>
          <h2 id="descargables" className="mt-2 text-h2">
            Para llevarte y usar en tu operativa
          </h2>
          <div className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {resources.map((resource) => (
              <article key={resource.id} className="flex h-full flex-col border-t border-border pt-4">
                <h3 className="font-display text-h3 font-semibold leading-tight text-fg">{resource.title}</h3>
                {resource.description ? (
                  <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-muted">
                    {resource.description}
                  </p>
                ) : null}
                {resource.slug === "maitreai-geo" ? (
                  <Link href="/blog/maitreai-geo" className={`mt-3 inline-block text-[0.9375rem] ${linkClass}`}>
                    Ver el artículo y el vídeo del episodio
                  </Link>
                ) : null}
                {resource.slug === "25-datos-emails-logisticos" ? (
                  <Link href="/blog/antes-del-tms-tu-inbox" className={`mt-3 inline-block text-[0.9375rem] ${linkClass}`}>
                    Leer el artículo sobre coste y ROI
                  </Link>
                ) : null}
                <div className="mt-4">
                  <SubscribeForm
                    source="recursos"
                    resource={resource.slug}
                    submitLabel="Enviármelo"
                    doneMessage="Hecho. Confirma en tu correo y te llega el enlace de descarga."
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* The calculator used to sit above the downloads and was always on the
          page, so an empty resource list still rendered something. Now that it
          lives in its own article, a failed read from Supabase would leave the
          page every visitor from the video lands on with nothing on it. Say so
          and give them a person, rather than an empty shelf that reads as "he
          has nothing". */}
      {resources.length === 0 ? (
        <section className="mt-14 max-w-2xl border-t border-accent pt-5 font-sans">
          <h2 className="text-h3">No puedo cargar los descargables ahora mismo</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            Es un fallo mío, no tuyo. Escríbeme a{" "}
            <a href={`mailto:${siteConfig.replyEmail}`} className={linkClass}>
              {siteConfig.replyEmail}
            </a>{" "}
            diciéndome cuál querías y te lo mando yo mismo, hoy.
          </p>
          {/* The footer drops its form here because this page has its own;
              with nothing to list, this is the page's only form. */}
          <div className="mt-5">
            <SubscribeForm source="recursos" />
          </div>
        </section>
      ) : null}

      {enPreparacion.length > 0 ? (
        <section className="mt-14 max-w-3xl font-sans" aria-labelledby="en-preparacion">
          <p className="font-sans text-[0.8125rem] font-semibold text-accent-ink">En el taller</p>
          <h2 id="en-preparacion" className="mt-2 text-h2">
            Lo que estoy construyendo ahora
          </h2>
          <ul className="mt-6 border-t border-border">
            {enPreparacion.map((item) => (
              <li key={item.id} className="border-b border-border py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-display text-h3 font-semibold leading-tight text-fg">{item.title}</h3>
                  <span className="font-sans text-[0.8125rem] text-muted">
                    <Estado evidencia={item.evidencia} />
                  </span>
                </div>
                {item.blurb ? (
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{item.blurb}</p>
                ) : null}
              </li>
            ))}
          </ul>
          {/* This used to carry a third form ("Avísame"), which is the same
              signup into the same list as the two cards above it — a page
              asking for one address three times is what made the funnel read
              as email-hungry. Anyone who took either resource is already
              subscribed, so the sentence does the job the form was doing. */}
          <p className="mt-6 text-[0.9375rem] text-muted">
            Cuando alguno esté publicado lo cuento en la newsletter. Si te has
            llevado cualquiera de los recursos de arriba, ya estás en ella.
          </p>
        </section>
      ) : null}
      <PuenteNbi guia="mapa" campana="herramientas" />
    </Container>
  );
}
