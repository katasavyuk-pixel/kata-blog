import type { ReactNode } from "react";
import Link from "next/link";
import { LogoSkill } from "@/components/marketplace/logo-skill";
import { NuevoBadge } from "@/components/home/nuevo-badge";
import { NoticiasFiltro } from "@/components/home/noticias-filtro";
import { PlanificadorEjemplo } from "@/components/home/planificador-ejemplo";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { Container } from "@/components/ui/container";
import { RETRATO } from "@/components/ui/retrato";
import { YouTubeFacade } from "@/components/video/youtube-facade";
import { TarjetaLinkedIn } from "@/components/linkedin/tarjeta-linkedin";
import { PUBLICACIONES_LINKEDIN } from "@/config/linkedin";
import { siteConfig } from "@/config/site";
import { REGALO } from "@/config/regalo";
import { COMO_SE_HACE_HREF, ETIQUETA_IA, etiquetaIa } from "@/config/noticias";
import { FORMATOS, etiquetaDeEje } from "@/config/taxonomy";
import { ACTIVOS } from "@/lib/catalogo";
import { formatDateShort } from "@/lib/format";
import type { PortadaLeida } from "@/lib/portada-lectura";
import { allPosts, type Post } from "@/lib/posts";
import type { Resource } from "@/lib/resources";
import { postDeRecurso } from "@/lib/portada-recursos";
import { datosRegaloDeLaSemana } from "@/lib/regalo-semana";
import { esNuevo, tituloEnFrase } from "@/lib/portada-texto";
import { getYouTubeVideos } from "@/lib/youtube";
import { ultimaEntrada } from "@/lib/bitacora";
import Image from "@/components/ui/imagen";
import "@/components/portada/portada.css";

/**
 * The home as the map of what a reader can do here (2026-10-14): four doors,
 * each with something real inside — the day's news with a filter by theme, the
 * marketplace of skills with their logos, a tool that works right here, and
 * the latest signed reading. Kata asked for it after finding the previous home
 * too much about him: his face and his promise moved to /sobre-mi.
 *
 * What goes in each door is decided in src/lib/portada-home.ts; a door with
 * nothing real in it renders nothing, heading included. The promise of the
 * page is the h1 and nothing stands before it (DESIGN.md rule 1): `cabecera`
 * is the hero, passed in by the page so tests/arquitectura.test.ts can see
 * from the page file what holds the form. The reader's lens went to /noticias,
 * next to the lead story it reads.
 */

const enlace = "font-semibold text-accent-ink underline underline-offset-[0.18em] hover:decoration-2";

/** The featured signed piece plus three reading cards. */
const MAX_FIRMADAS = 7;

export async function Portada({ portada, cabecera }: { portada: PortadaLeida; cabecera: ReactNode }) {
  const { primera, breves, firmadas: piezasFirmadas } = portada;
  const { regalo: recursoDestacado, recursos } = await datosRegaloDeLaSemana();
  const activos = ACTIVOS;
  // Signed pieces, whether a triad holds them or not, newest first.
  const firmadas = [...piezasFirmadas]
    .filter((post) => !post.protagonista && post.formato !== "radar" && post.formato !== "leccion")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_FIRMADAS);
  const destacado = firmadas[0];
  const articuloRegalo = recursoDestacado ? postDeRecurso(recursoDestacado.slug, allPosts) : undefined;

  return (
    <>
      {cabecera}
      <Container size="wide" className="pb-16 sm:pb-24">
        {primera ? <NoticiaDelDia primera={primera} /> : null}
        {destacado ? <Destacado post={destacado} /> : null}
        {recursoDestacado ? <RegaloSemana recurso={recursoDestacado} post={articuloRegalo} /> : null}
        {firmadas.length > 1 ? <PuertaLecturas firmadas={firmadas.slice(1, 7)} /> : null}

        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          {primera || breves ? <PuertaNoticias primera={primera} breves={breves} /> : null}

          {activos.length > 0 ? (
            <Puerta
              id="puerta-marketplace"
              titulo="Marketplace"
              icono="M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M16.5 13v7 M13 16.5h7"
              entradilla={`Skills para Claude, Codex y otros agentes. Se instalan las ${activos.length} a la vez.`}
            >
              <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
                {activos.map((activo) => (
                  <li key={activo.id}>
                    <Link href={activo.href} className="group flex flex-col items-start gap-2">
                      <LogoSkill id={activo.id} size={56} />
                      <span className="font-sans text-[0.9375rem] font-semibold leading-tight text-fg group-hover:text-accent-ink">
                        {activo.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-muted">
                La primera pregunta por tu negocio una vez; las demás leen lo que respondiste y se adaptan a él.
              </p>
              <p className="mt-3 font-sans text-[0.9375rem]">
                <Link href="/marketplace" className={enlace}>
                  Ver el marketplace
                </Link>
              </p>
            </Puerta>
          ) : null}

          <Puerta
            id="puerta-herramientas"
            titulo="Herramientas"
            icono="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z"
            entradilla="Se usan aquí, en el navegador, sin cuenta."
          >
            <div className="mt-4">
              <PlanificadorEjemplo />
            </div>
            <ul className="mt-4 font-sans text-[0.9375rem]">
              <li className="border-b border-border py-2.5">
                <Link href="/cuanto-cuesta-la-ia" className="font-semibold text-fg hover:text-accent-ink">
                  Calculadora de costes de IA
                </Link>{" "}
                <span className="text-muted">La factura al mes, con el precio de cada modelo y su fecha.</span>
              </li>
              <li className="border-b border-border py-2.5">
                <Link href="/que-proceso-automatizar-primero" className="font-semibold text-fg hover:text-accent-ink">
                  Puntúa tus procesos
                </Link>{" "}
                <span className="text-muted">Cinco notas del 1 al 5 y sale el orden en que automatizar.</span>
              </li>
              <li className="py-2.5">
                <Link href="/empieza-aqui" className="font-semibold text-fg hover:text-accent-ink">
                  Entiende la IA tocándola
                </Link>{" "}
                <span className="text-muted">Lecciones que se manipulan, gratis y sin registro.</span>
              </li>
            </ul>
          </Puerta>

          <PuertaVideos />

          {PUBLICACIONES_LINKEDIN.length > 0 ? <PuertaLinkedIn /> : null}
        </div>

        {recursos.length > 0 ? <ArchivoRegalos recursos={recursos} /> : null}
        <QuienEscribe />
      </Container>
    </>
  );
}

/** A door: a white panel with its icon, its name, one line, and what is inside. */
function Puerta({
  id,
  titulo,
  icono,
  entradilla,
  children,
  className,
}: {
  id: string;
  titulo: string;
  icono: string;
  entradilla: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`min-w-0 border border-border bg-panel p-6 ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        <svg aria-hidden width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-fg">
          <path d={icono} />
        </svg>
        <h2 id={id} className="text-[1.75rem] font-semibold leading-tight">
          {titulo}
        </h2>
      </div>
      <p className="mt-2 font-sans text-[0.875rem] text-muted">{entradilla}</p>
      {children}
    </section>
  );
}

function ImagenPost({ post, sizes, imagen }: { post?: Post; sizes: string; imagen?: typeof REGALO.imagen }) {
  const cover = post?.cover ?? imagen;
  return (
    <div className="relative aspect-video overflow-hidden bg-surface-2">
      {cover ? (
        <Image src={cover.src} alt={post?.cover ? post.coverAlt ?? "" : imagen?.alt ?? ""} fill sizes={sizes} className="object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center font-sans text-label text-muted">
          {post ? FORMATOS[post.formato] : "Gratis"}
        </span>
      )}
    </div>
  );
}

function NoticiaDelDia({ primera }: { primera: NonNullable<PortadaLeida["primera"]> }) {
  const { articulo, lecturas, alDia } = primera;
  const avisoIa = etiquetaIa(articulo);

  return (
    <section
      aria-labelledby="noticia-del-dia"
      className="mt-8 border border-t-[3px] border-border border-t-accent bg-panel p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 font-sans text-label">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
          <span className="font-semibold text-accent-ink">
            {alDia ? "📰 Noticia del día" : "📰 Última noticia destacada"}
          </span>
          <span aria-hidden className="text-faint">·</span>
          <time dateTime={articulo.date}>{formatDateShort(articulo.date)}</time>
          {avisoIa ? (
            <>
              <span aria-hidden className="text-faint">·</span>
              <Link href={COMO_SE_HACE_HREF} className="hover:text-fg hover:underline">
                {avisoIa}
              </Link>
            </>
          ) : null}
        </p>
        {esNuevo(articulo.date, new Date()) ? <NuevoBadge /> : null}
      </div>

      <div
        className={
          lecturas
            ? "mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start"
            : "mt-4"
        }
      >
        <div className="min-w-0">
          <h2 id="noticia-del-dia" className="font-display text-[1.5625rem] font-semibold leading-tight sm:text-[1.875rem]">
            <Link href={articulo.permalink} className="hover:text-accent-ink">
              {tituloEnFrase(articulo.title)}
            </Link>
          </h2>
          <p className="mt-3 max-w-[62ch] text-[1.0625rem] leading-relaxed text-muted">
            {articulo.dek ?? articulo.description}
          </p>
          {!alDia ? (
            <p className="mt-2.5 font-sans text-[0.875rem] text-amber">
              Hoy todavía no hay análisis largo nuevo; aquí tienes la última noticia destacada.
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-[0.9375rem]">
            <Link href={articulo.permalink} className={enlace}>
              📖 Leer análisis completo
            </Link>
            {articulo.fuente_url && articulo.fuente_medio ? (
              <a
                href={articulo.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-accent-ink hover:underline"
              >
                🔗 Fuente: {articulo.fuente_medio}
              </a>
            ) : null}
            <Link href="/noticias" className="text-muted hover:text-fg hover:underline">
              🗞️ Todas las noticias
            </Link>
          </div>
        </div>

        {lecturas ? (
          <div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.05em] text-muted">
              🧭 Clave para tu negocio
            </p>
            <p className="mt-2 line-clamp-4 text-[0.9375rem] leading-relaxed text-muted">
              {lecturas.direccion}
            </p>
            <p className="mt-3 font-sans text-[0.8125rem] text-faint">
              Incluye lectura para Dirección, Operaciones y Tecnología.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Destacado({ post }: { post: Post }) {
  return (
    <article className="mt-8 border border-border bg-panel">
      <div className="grid md:grid-cols-2">
        <Link href={post.permalink} aria-label={post.title} className="block">
          <ImagenPost post={post} sizes="(min-width: 1024px) 50vw, 100vw" />
        </Link>
        <div className="flex min-w-0 flex-col p-5 sm:p-7">
          <p className="flex items-center justify-between gap-3 font-sans text-label font-semibold text-accent-ink">
            <span>Primicia</span>
            {esNuevo(post.date, new Date()) ? <NuevoBadge /> : null}
          </p>
          <h2 className="mt-3 font-display text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">
            <Link href={post.permalink} className="hover:text-accent-ink">{post.title}</Link>
          </h2>
          <p className="mt-3 line-clamp-4 text-[1.125rem] leading-relaxed text-muted">{post.dek ?? post.description}</p>
          <time dateTime={post.date} className="mt-auto pt-5 font-sans text-label text-muted">
            {formatDateShort(post.date)}
          </time>
        </div>
      </div>
    </article>
  );
}

function RegaloSemana({ recurso, post }: { recurso: Resource; post?: Post }) {
  return (
    <section aria-labelledby="regalo-semana" className="mt-8 border border-border bg-surface p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-4 md:items-center">
        <Link href={post?.permalink ?? "/#newsletter"} aria-label={post?.title ?? recurso.title} className="gift-thumbnail-float block md:col-span-1">
          <ImagenPost post={post} imagen={recurso.slug === REGALO.hoja.slug ? REGALO.imagen : undefined} sizes="(min-width: 1024px) 24vw, 100vw" />
        </Link>
        <div className="min-w-0 md:col-span-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="regalo-semana" className="font-display text-h2">El regalo de esta semana</h2>
            <span className="font-sans text-label font-semibold text-accent-ink">Gratis</span>
          </div>
          <h3 className="mt-2 font-display text-[1.375rem] font-medium leading-tight">{recurso.title}</h3>
          {recurso.description ? <p className="mt-1.5 line-clamp-2 text-[1rem] leading-relaxed text-muted">{recurso.description}</p> : null}
          <p className="mt-2 font-sans text-[0.875rem] text-muted">Te llega al suscribirte con tu email.</p>
          <div className="mt-3">
            <SubscribeForm
              resource={recurso.slug}
              source="home-regalo"
              submitLabel="Enviármelo"
              doneMessage="Hecho. Confirma en tu correo y te llega la descarga en el mismo email."
            />
          </div>
          {post ? <Link href={post.permalink} className={`mt-3 inline-block font-sans text-[0.9375rem] ${enlace}`}>Ver el artículo</Link> : null}
        </div>
      </div>
    </section>
  );
}

function ArchivoRegalos({ recursos }: { recursos: Resource[] }) {
  return (
    <section aria-labelledby="archivo-regalos" className="mt-14">
      <h2 id="archivo-regalos" className="text-h2-section">Regalos</h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {recursos.map((recurso) => {
          const post = postDeRecurso(recurso.slug, allPosts);
          const esRegaloAlta = recurso.slug === REGALO.hoja.slug;
          const titulo = esRegaloAlta ? REGALO.titulo : recurso.title;
          const descripcion = esRegaloAlta ? REGALO.resumen : recurso.description;
          return (
            <li key={recurso.id} className="flex min-w-0 flex-col border border-border bg-panel">
              <Link href={post?.permalink ?? "/#newsletter"} aria-label={titulo} className="block">
                <ImagenPost post={post} imagen={esRegaloAlta ? REGALO.imagen : undefined} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-[1.25rem] font-medium leading-snug">
                  <Link href={post?.permalink ?? "/#newsletter"} className="hover:text-accent-ink">{titulo}</Link>
                </h3>
                {descripcion ? <p className="mt-2 line-clamp-4 text-[1rem] leading-relaxed text-muted">{descripcion}</p> : null}
                {post ? <Link href={post.permalink} className={`mt-auto pt-4 font-sans text-[0.9375rem] ${enlace}`}>Ver el artículo</Link> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PuertaNoticias({ primera, breves }: Pick<PortadaLeida, "primera" | "breves">) {
  const fecha = breves?.edicion.date ?? primera?.articulo.date;
  return (
    <Puerta
      id="puerta-noticias"
      titulo="Noticias"
      icono="M4 5h13v14H5a1 1 0 0 1-1-1z M17 9h3v9a1 1 0 0 1-1 1h-2 M7 9h7 M7 12.5h7 M7 16h4"
      entradilla={
        <>
          {fecha ? (
            <>
              {breves?.alDia || primera?.alDia ? "Hoy" : "La última edición"},{" "}
              <time dateTime={fecha}>{formatDateShort(fecha)}</time>.{" "}
            </>
          ) : null}
          {!primera || etiquetaIa(primera.articulo) ? (
            <Link href={COMO_SE_HACE_HREF} className="hover:underline">
              {primera ? etiquetaIa(primera.articulo) : ETIQUETA_IA}
            </Link>
          ) : null}
        </>
      }
    >
      {primera ? (
        <article className="mt-4 border-t-[3px] border-accent pt-3">
          <p className="font-sans text-[0.8125rem] font-semibold text-accent-ink">
            {primera.alDia ? "La noticia del día" : "El último artículo completo"}
          </p>
          <h3 className="mt-1 flex flex-wrap items-center gap-2 font-display text-[1.375rem] font-medium leading-snug">
            <Link href={primera.articulo.permalink} className="hover:text-accent-ink">
              {tituloEnFrase(primera.articulo.title)}
            </Link>
            {esNuevo(primera.articulo.date, new Date()) ? <NuevoBadge /> : null}
          </h3>
        </article>
      ) : null}
      {breves ? (
        <div className="mt-5">
          <NoticiasFiltro
            items={breves.items.map((item) => ({ ...item, tema: etiquetaDeEje(item.eje) }))}
          />
        </div>
      ) : null}
      <p className="mt-3 font-sans text-[0.9375rem]">
        <Link href="/noticias" className={enlace}>
          Todas las noticias
        </Link>
      </p>
    </Puerta>
  );
}

function PuertaLecturas({ firmadas }: { firmadas: Post[] }) {
  return (
    <Puerta
      id="puerta-catalogo"
      titulo="Catálogo"
      icono="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z M12 6.5V19.5"
      entradilla="Guías, casos, notas y reflexiones, con sus números y con lo que falló."
      className="mt-8 lg:col-span-2"
    >
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {firmadas.map((post) => (
          <li key={post.slug} className="flex min-w-0 flex-col border border-border bg-bg">
            <Link href={post.permalink} aria-label={post.title} className="block">
              <ImagenPost post={post} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" />
            </Link>
            <div className="flex flex-1 flex-col p-4">
              <p className="flex items-center justify-between gap-2 font-sans text-label text-accent-ink">
                <span>{FORMATOS[post.formato]}</span>
                {esNuevo(post.date, new Date()) ? <NuevoBadge /> : null}
              </p>
              <h3 className="mt-2 font-display text-[1.375rem] font-semibold leading-snug">
                <Link href={post.permalink} className="hover:text-accent-ink">{post.title}</Link>
              </h3>
              <p className="mt-2 line-clamp-3 text-[1rem] leading-relaxed text-muted">{post.dek ?? post.description}</p>
              <time dateTime={post.date} className="mt-auto pt-4 font-sans text-label text-muted">{formatDateShort(post.date)}</time>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-sans text-[0.9375rem]">
        <Link href="/lecturas" className={enlace}>
          Todas las lecturas
        </Link>
      </p>
    </Puerta>
  );
}

/** How many more episodes the video door lists beside the newest one. */
const MAX_OTROS = 2;

/**
 * The channel, read from its feed (src/lib/youtube.ts): the newest episode
 * playable here, and the next ones beside it. Episodes only: Shorts stay off
 * the site for now (`MOSTRAR_CORTOS`). Async because the feed is a fetch with
 * its own 15-minute revalidation, not a file. Renders nothing when the
 * channel has nothing to show.
 */
async function PuertaVideos() {
  const videos = await getYouTubeVideos();
  const [episodio, ...resto] = videos.filter((video) => !video.short);
  if (!episodio) return null;
  const otros = resto.slice(0, MAX_OTROS);
  const articulo = allPosts.find((post) => post.youtubeId === episodio.id);

  return (
    <Puerta
      id="puerta-videos"
      titulo="Vídeos"
      icono="M3 6h13v12H3z M16 10l5-3v10l-5-3"
      entradilla="Monto un sistema en un negocio de verdad y lo grabo de principio a fin."
    >
      <div className="mt-5 min-w-0">
        <YouTubeFacade id={episodio.id} title={episodio.title} sizes="(min-width: 1024px) 40vw, 100vw" />
        <h3 className="mt-3 font-display text-[1.375rem] font-medium leading-snug">{episodio.title}</h3>
        {articulo ? (
          <p className="mt-1.5 font-sans text-[0.9375rem]">
            <Link href={articulo.permalink} className={enlace}>
              Léelo con sus números
            </Link>
          </p>
        ) : null}
      </div>
      {otros.length > 0 ? (
        <ul className="mt-4 grid gap-x-4 sm:grid-cols-2">
          {otros.map((video) => (
            <li key={video.id} className="border-t border-border py-3">
              <Link href={`/videos#video-${video.id}`} className="group grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3">
                <span className="relative block aspect-video overflow-hidden bg-fg">
                  <Image
                    src={video.image}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </span>
                <span className="font-display text-[0.9375rem] leading-snug text-fg group-hover:text-accent-ink">
                  {video.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-5 font-sans text-[0.9375rem]">
        <Link href="/videos" className={enlace}>
          Todos los vídeos
        </Link>
      </p>
    </Puerta>
  );
}

/** How many LinkedIn posts the home shows; the rest are on /sobre-mi. */
const MAX_LINKEDIN = 3;

/**
 * What I write on LinkedIn (2026-10-15), the newest few, as cards in the
 * site's style; the list and why some posts are left out live in
 * config/linkedin.ts.
 */
function PuertaLinkedIn() {
  const linkedin = siteConfig.social.find((red) => red.label === "LinkedIn");
  return (
    <Puerta
      id="puerta-linkedin"
      titulo="En LinkedIn"
      icono="M4 9h3v11H4z M5.5 4.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3 M10 9h3v1.6c.6-1 1.8-1.8 3.3-1.8 2.4 0 3.7 1.5 3.7 4.4V20h-3v-6.2c0-1.5-.6-2.4-1.9-2.4-1.4 0-2.1 1-2.1 2.4V20h-3z"
      entradilla="Lo que cuento allí, cuando lo cuento."
      className="lg:col-span-2"
    >
      <ul className="mt-5 grid gap-4 md:grid-cols-3">
        {PUBLICACIONES_LINKEDIN.slice(0, MAX_LINKEDIN).map((publicacion) => (
          <li key={publicacion.id} className="min-w-0">
            <TarjetaLinkedIn publicacion={publicacion} />
          </li>
        ))}
      </ul>
      {linkedin ? (
        <p className="mt-5 font-sans text-[0.9375rem]">
          <a href={linkedin.href} target="_blank" rel="noopener noreferrer" className={enlace}>
            Seguirme en LinkedIn
          </a>
        </p>
      ) : null}
    </Puerta>
  );
}

/**
 * Who writes this, after the doors (Kata, 2026-10-15): he wanted «Sobre mí»
 * back in sight, but not in front of what the reader came for — the portrait
 * opening the home was what he found too much about him on 14-oct. Three lines,
 * the last thing he shipped (from /bitacora) and the way to the whole story.
 */
function QuienEscribe() {
  const ultima = ultimaEntrada();
  return (
    <section aria-labelledby="quien-escribe" className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-6 border-t border-border pt-10">
      <Image
        src={RETRATO.src}
        width={RETRATO.width}
        height={RETRATO.height}
        alt={RETRATO.alt}
        sizes="140px"
        className="h-auto w-28 shrink-0 border border-border sm:w-36"
      />
      <div className="min-w-0 flex-[1_1_24rem]">
        <h2 id="quien-escribe" className="text-[1.75rem] font-semibold leading-tight">
          Quién escribe esto
        </h2>
        <p className="mt-3 max-w-[60ch] text-[1.1875rem] leading-relaxed text-muted">
          Soy {siteConfig.author.name}. Monto sistemas de IA en mi propio negocio y aquí enseño cada uno: qué hace,
          cómo está montado, cuánto cuesta y dónde falló.
        </p>
        {ultima ? (
          <p className="mt-3 max-w-[60ch] font-sans text-[0.9375rem] text-muted">
            Lo último que he construido:{" "}
            <Link href={ultima.permalink} className="font-semibold text-fg hover:text-accent-ink">
              {ultima.titulo}
            </Link>
            , <time dateTime={ultima.fecha}>{formatDateShort(ultima.fecha)}</time>.
          </p>
        ) : null}
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-sans text-[0.9375rem]">
          <Link href="/sobre-mi#por-que" className={enlace}>
            Por qué hago esto
          </Link>
          <Link href="/bitacora" className={enlace}>
            La bitácora
          </Link>
        </p>
      </div>
    </section>
  );
}
