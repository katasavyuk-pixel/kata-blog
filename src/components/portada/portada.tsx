import type { ReactNode } from "react";
import Link from "next/link";
import { LogoSkill } from "@/components/marketplace/logo-skill";
import { NoticiasFiltro } from "@/components/home/noticias-filtro";
import { PlanificadorEjemplo } from "@/components/home/planificador-ejemplo";
import { Container } from "@/components/ui/container";
import { RETRATO } from "@/components/ui/retrato";
import { YouTubeFacade } from "@/components/video/youtube-facade";
import { TarjetaLinkedIn } from "@/components/linkedin/tarjeta-linkedin";
import { PUBLICACIONES_LINKEDIN } from "@/config/linkedin";
import { siteConfig } from "@/config/site";
import { COMO_SE_HACE_HREF, ETIQUETA_IA, etiquetaIa } from "@/config/noticias";
import { FORMATOS, etiquetaDeEje } from "@/config/taxonomy";
import { ACTIVOS } from "@/lib/catalogo";
import { formatDateShort } from "@/lib/format";
import type { PortadaLeida } from "@/lib/portada-lectura";
import { allPosts, type Post } from "@/lib/posts";
import { getYouTubeVideos } from "@/lib/youtube";
import { ultimaEntrada } from "@/lib/bitacora";
import Image from "next/image";

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

/** How many signed pieces the reading door shows. */
const MAX_FIRMADAS = 3;

export function Portada({ portada, cabecera }: { portada: PortadaLeida; cabecera: ReactNode }) {
  const { primera, breves, triadas, lecturas } = portada;
  const activos = ACTIVOS;
  // Signed pieces, whether a triad holds them or not, newest first.
  const firmadas = [...triadas.map((triada) => triada.pieza), ...lecturas]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_FIRMADAS);

  return (
    <>
      {cabecera}
      <Container size="wide" className="pb-16 sm:pb-24">
        <div className="grid gap-6 lg:grid-cols-2">
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
                <Link href="/blog/cuanto-cuesta-la-ia" className="font-semibold text-fg hover:text-accent-ink">
                  Calculadora de costes de IA
                </Link>{" "}
                <span className="text-muted">La factura al mes, con el precio de cada modelo y su fecha.</span>
              </li>
              <li className="border-b border-border py-2.5">
                <Link href="/blog/que-proceso-automatizar-primero" className="font-semibold text-fg hover:text-accent-ink">
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

          {firmadas.length > 0 ? <PuertaLecturas firmadas={firmadas} /> : null}

          <PuertaVideos />

          {PUBLICACIONES_LINKEDIN.length > 0 ? <PuertaLinkedIn /> : null}
        </div>

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
          <h3 className="mt-1 font-display text-[1.375rem] font-medium leading-snug">
            <Link href={primera.articulo.permalink} className="hover:text-accent-ink">
              {primera.articulo.title}
            </Link>
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
      id="puerta-lecturas"
      titulo="Lecturas"
      icono="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z M12 6.5V19.5"
      entradilla="Guías, reflexiones y casos, con sus números y con lo que falló."
    >
      <ul className="mt-4">
        {firmadas.map((post) => (
          <li key={post.slug} className="border-t border-border">
            <Link href={post.permalink} className="group block py-3.5">
              <span className="block text-[1.1875rem] leading-snug text-fg group-hover:text-accent-ink">
                {post.dek ?? post.description}
              </span>
              <span className="mt-1.5 block font-sans text-[0.8125rem] text-muted">
                <span className="font-semibold text-fg">{post.title}</span> {FORMATOS[post.formato]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-sans text-[0.9375rem]">
        <Link href="/blog" className={enlace}>
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
      className="lg:col-span-2"
    >
      <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0">
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
          <ul className="min-w-0 self-start">
            {otros.map((video) => (
              <li key={video.id} className="border-t border-border first:border-t-0 first:pt-0 pt-4 pb-4">
                <Link href={`/videos#video-${video.id}`} className="group grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-3">
                  <span className="relative block aspect-video overflow-hidden bg-fg">
                    <Image
                      src={video.image}
                      alt=""
                      fill
                      sizes="128px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="font-display text-[1.0625rem] leading-snug text-fg group-hover:text-accent-ink">
                    {video.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
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
