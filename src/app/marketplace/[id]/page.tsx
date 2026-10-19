import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { JsonLd } from "@/components/ui/json-ld";
import { NotaCard } from "@/components/content/nota-card";
import { Instalar } from "@/components/marketplace/instalar";
import { Estado } from "@/components/sistema/estado";
import {
  CATALOGO,
  CATALOGO_REPO_URL,
  carpetaEnRepo,
  comandoDeSkill,
  urlEnRepo,
} from "@/config/catalogo";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";
import { TEMAS } from "@/config/taxonomy";
import { LogoSkill } from "@/components/marketplace/logo-skill";
import { ACTIVOS, TIPO_ACTIVO, getActivo, rutaDeActivo } from "@/lib/catalogo";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, personJsonLd, softwareSourceCodeJsonLd } from "@/lib/jsonld";
import { apareceEn } from "@/lib/relaciones";

/**
 * The page of one installable asset: its spec sheet.
 *
 * Only items with an `activo` have one (`ACTIVOS`), so a system that is
 * documented but not installable does not get an empty page. Every row comes
 * from config/library, where `assertActivo` has already refused a blank one:
 * what it is for and for whom, how it is installed, what it needs, what it
 * reads and writes, what it costs, what broke, how it was tested, which
 * version this is and under what licence.
 */

export function generateStaticParams() {
  return ACTIVOS.map((item) => ({ id: item.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = getActivo(id);
  if (!item) return {};
  const path = rutaDeActivo(item.id);
  return withOpenGraph(
    path,
    {
      // Written for the search (`tituloBusqueda`), so it takes the whole <title>.
      title: { absolute: item.activo.tituloBusqueda },
      description: item.queHace,
      alternates: { ...feedAlternates, canonical: path },
    },
    { ogExtra: { type: "article" } },
  );
}

const linkClass =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

function Apartado({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-12 border-t border-border pt-6">
      <h2 id={id} className="text-h2">
        {titulo}
      </h2>
      <div className="mt-4 space-y-3 text-[1.0625rem] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Lista({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function ActivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getActivo(id);
  if (!item) notFound();

  const { activo } = item;
  const path = rutaDeActivo(item.id);
  const fichero = urlEnRepo(`${activo.ruta}/SKILL.md`);
  const menciones = apareceEn(item.id);
  // Every skill but the entry one starts from the profile the entry one creates.
  const entrada = item.id === CATALOGO.entrada ? undefined : getActivo(CATALOGO.entrada);
  // Six are few enough to list them all: the ones of the same theme first.
  const otros = ACTIVOS.filter((otro) => otro.id !== item.id).sort(
    (a, b) => Number(b.tema === item.tema) - Number(a.tema === item.tema),
  );

  return (
    <Container className="py-10 sm:py-14">
      <JsonLd
        data={[
          softwareSourceCodeJsonLd({
            nombre: item.title,
            descripcion: item.queHace,
            path,
            codeRepository: CATALOGO_REPO_URL,
            version: activo.version,
            publicado: activo.publicado,
            licencia: activo.licencia,
          }),
          personJsonLd(),
          breadcrumbJsonLd([
            { name: "Marketplace", path: "/marketplace" },
            { name: item.title, path },
          ]),
        ]}
      />

      <div className="mx-auto max-w-[66ch]">
        <header>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <h1 className="text-h1 font-medium">{item.title}</h1>
            {/* The logo is decoration next to the name; visually it leads. */}
            <LogoSkill id={item.id} size={64} className="order-first" />
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 font-sans text-[0.9375rem] text-muted">
            <Link href="/marketplace" className="font-semibold text-accent-ink hover:underline">
              {TIPO_ACTIVO[activo.tipo]} del marketplace
            </Link>
            <span>{TEMAS[item.tema]}</span>
          </p>
          <p className="mt-4 text-[1.1875rem] leading-relaxed text-muted">{item.queHace}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 font-sans text-sm">
            <Estado evidencia={item.evidencia} variant="pill" />
            <span className="font-sans text-[0.8125rem] text-muted">
              v{activo.version} <span aria-hidden>·</span>{" "}
              <time dateTime={activo.publicado}>{formatDate(activo.publicado)}</time>{" "}
              <span aria-hidden>·</span> {activo.licencia}
            </span>
          </div>
        </header>

        <Apartado id="instalar" titulo="Cómo se instala">
          <p>
            Viene con el resto de las skills, en un solo paquete, y funciona en la aplicación de Claude, en Claude
            Code, en Codex y en cualquier agente que lea el formato Agent Skills. Elige el tuyo:
          </p>
          <Instalar />
          <p>
            En Claude Code se llama con <code className="font-mono text-[0.9375rem] text-fg">{comandoDeSkill(item.id)}</code>;
            en cualquier agente, se activa sola cuando lo que pides encaja con lo que hace.
          </p>
          {entrada ? (
            <p>
              La primera vez, pasa antes por{" "}
              <Link href={entrada.href} className={linkClass}>
                la bienvenida
              </Link>
              : pregunta por tu negocio una vez y esta skill trabaja con esos datos. Si no lo
              haces, te preguntará solo lo que le falte.
            </p>
          ) : null}
          <p>
            Las seis están probadas de principio a fin en Claude Code. En la aplicación de Claude solo se ha puesto en
            marcha la bienvenida; en Codex, la bienvenida y la previsión de caja; en OpenCode, la previsión de caja.
          </p>
          <p>
            Antes de instalarla, léela: sus instrucciones y su script están a la vista.{" "}
            <a href={fichero} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Leer las instrucciones
            </a>{" "}
            o{" "}
            <a href={carpetaEnRepo(activo.ruta)} target="_blank" rel="noopener noreferrer" className={linkClass}>
              ver la carpeta entera
            </a>
            .
          </p>
        </Apartado>

        <Apartado id="para-quien" titulo="Para quién es, y para quién no">
          <p>
            <span className="text-fg">Es para:</span> {activo.paraQuien}
          </p>
          <p>
            <span className="text-fg">No es para:</span> {activo.noEsPara}
          </p>
        </Apartado>

        <Apartado id="requisitos" titulo="Qué necesita">
          <Lista items={activo.requisitos} />
        </Apartado>

        <Apartado id="permisos" titulo="Qué lee, qué escribe y qué sale de tu equipo">
          <p className="text-fg">Lee</p>
          <Lista items={activo.lee} />
          <p className="pt-2 text-fg">Escribe</p>
          {activo.escribe.length > 0 ? <Lista items={activo.escribe} /> : <p>Nada.</p>}
          <p className="pt-2 text-fg">Sale de tu equipo</p>
          <p>{activo.red}</p>
        </Apartado>

        <Apartado id="se-rompio" titulo="Qué se ha roto">
          {item.seRompio.length > 0 ? (
            <ul className="grid gap-2 rounded-sm bg-accent/12 px-4 py-3.5 text-fg">
              {item.seRompio.map((line) => (
                <li key={line} className="flex gap-2">
                  <Icon name="cross" className="mt-1 shrink-0 text-accent-ink" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Nada documentado todavía en esta versión. Cuando falle algo, queda apuntado aquí, como
              en el resto de los sistemas.
            </p>
          )}
        </Apartado>

        <Apartado id="coste" titulo="Qué cuesta usarla">
          {item.costeMensual.medido ? (
            <p>
              {item.costeMensual.valor} ({item.costeMensual.fuente}, comprobado el{" "}
              {formatDate(item.costeMensual.comprobado)}).
            </p>
          ) : (
            <p>Sin medir: {item.costeMensual.motivo}. La skill es gratuita.</p>
          )}
        </Apartado>

        <Apartado id="pruebas" titulo="Cómo se ha probado">
          <p>{activo.pruebas}</p>
          {item.evidencia.tipo === "reproducible" ? (
            <p>
              Puedes verlo antes de instalar nada:{" "}
              <a
                href={
                  item.evidencia.ruta.includes(".")
                    ? urlEnRepo(item.evidencia.ruta)
                    : carpetaEnRepo(item.evidencia.ruta)
                }
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {item.evidencia.ruta.includes(".") ? "las pruebas de su script" : "el ejemplo resuelto"}
              </a>{" "}
              está en el repositorio.
            </p>
          ) : null}
        </Apartado>

        <Apartado id="version" titulo="Versión y licencia">
          <p>
            Versión {activo.version}, del {formatDate(activo.publicado)}. Licencia {activo.licencia}:
            puedes usarla, cambiarla y adaptarla a tu negocio.
          </p>
          <p>
            Repositorio:{" "}
            <a href={CATALOGO_REPO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {CATALOGO.repo.owner}/{CATALOGO.repo.name}
            </a>
            . Si hace algo que no debería, abre una incidencia allí o escríbeme a{" "}
            <a href={`mailto:${siteConfig.replyEmail}`} className={linkClass}>
              {siteConfig.replyEmail}
            </a>
            .
          </p>
        </Apartado>

        {menciones.length > 0 ? (
          <Apartado id="aparece-en" titulo="Aparece en">
            <div className="space-y-6">
              {menciones.map((post) => (
                <NotaCard key={post.slug} post={post} cover={false} />
              ))}
            </div>
          </Apartado>
        ) : null}

        {otros.length > 0 ? (
          <Apartado id="relacionadas" titulo="Las demás skills">
            <ul className="space-y-3">
              {otros.map((otro) => (
                <li key={otro.id}>
                  <Link href={otro.href} className={linkClass}>
                    {otro.title}
                  </Link>
                  <span className="block text-[0.9375rem]">{otro.queHace}</span>
                </li>
              ))}
            </ul>
          </Apartado>
        ) : null}

        <p className="mt-12 border-t border-border pt-6 font-sans text-[0.9375rem]">
          <Link href="/marketplace" className={linkClass}>
            Todas las skills
          </Link>
        </p>
      </div>
    </Container>
  );
}
