import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Prose } from "@/components/ui/prose";
import { Secuencia } from "@/components/newsletter/secuencia";
import {
  esVisual,
  etiquetaDeConstruido,
  partesDeEdicion,
  proyectoDe,
  rotuloDeImportante,
  skillDeEdicion,
  type Edicion,
} from "@/lib/edicion";

/**
 * A newsletter edition on its archive page, block by block in the same order
 * as the email (src/emails/edicion.tsx): the web twin of each block, in the
 * site's tokens instead of inline styles. An edition without blocks is its
 * body in `Prose`, as it always was.
 */

const etiqueta = "font-sans text-[0.75rem] font-bold uppercase tracking-[0.08em] text-accent-ink";

/** Internal paths through next/link; anything else opens where it is. */
function Enlace({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function Bloque({ id, titulo, children }: { id: string; titulo: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10 border-t-[3px] border-accent pt-3">
      <h2 id={id} className={etiqueta}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Cuerpo({ html, className }: { html: string; className?: string }) {
  return (
    <Prose className={className}>
      {/* The edition as subscribers read it: versioned markdown, same trust as a post. */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </Prose>
  );
}

export function EdicionWeb({ edicion }: { edicion: Edicion }) {
  if (!esVisual(edicion)) return <Cuerpo html={edicion.html} className="mt-10" />;

  const { entrada, importante, secciones, noticias } = partesDeEdicion(edicion);
  const skill = edicion.skill ? skillDeEdicion(edicion.skill) : undefined;

  return (
    <div className="mt-8">
      {edicion.imagen ? (
        <div className="relative aspect-[15/7] overflow-hidden bg-surface">
          <Image src={edicion.imagen.src} alt={edicion.imagen.alt} fill priority sizes="(min-width: 768px) 66ch, 100vw" className="object-cover" />
        </div>
      ) : null}

      {edicion.minuto?.length ? (
        <section aria-labelledby="en-un-minuto" className="mt-8 bg-surface px-5 py-4 font-sans">
          <h2 id="en-un-minuto" className="font-sans text-[0.75rem] font-bold uppercase tracking-[0.08em] text-fg">
            En un minuto
          </h2>
          <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed text-fg marker:text-accent">
            {edicion.minuto.map((punto) => (
              <li key={punto}>{punto}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {edicion.secuencia ? (
        <div className="mt-8">
          <Secuencia titulo={edicion.secuencia.titulo} pasos={edicion.secuencia.pasos} />
        </div>
      ) : null}

      {entrada ? <Cuerpo html={entrada} className="mt-8" /> : null}

      {edicion.importante || importante ? (
        <Bloque id="importante" titulo="Lo importante de esta semana">
          {edicion.importante?.imagen ? (
            <div className="relative mt-4 aspect-[536/220] overflow-hidden bg-surface">
              <Image
                src={edicion.importante.imagen.src}
                alt={edicion.importante.imagen.alt}
                fill
                sizes="(min-width: 768px) 66ch, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
          {edicion.importante?.titulo ? (
            <p className="mt-4 font-display text-[1.3125rem] leading-snug text-fg">{edicion.importante.titulo}</p>
          ) : null}
          {importante ? <Cuerpo html={importante} className="mt-3" /> : null}
          {edicion.importante?.url ? (
            <p className="mt-3 font-sans text-[0.8125rem]">
              <Enlace href={edicion.importante.url} className="font-semibold text-accent-ink underline underline-offset-[0.18em] hover:decoration-2">
                {rotuloDeImportante(edicion.importante)}
              </Enlace>
            </p>
          ) : null}
        </Bloque>
      ) : null}

      {edicion.construido?.length ? (
        <Bloque id="construido" titulo="Lo que he construido">
          <ul className="mt-4 space-y-5">
            {edicion.construido.map((item) => (
              <li key={item.url + item.titulo}>
                <Enlace href={item.url} className="group flex gap-4 font-sans">
                  {item.imagen ? (
                    <span className="relative block aspect-[3/2] w-[38%] max-w-[168px] shrink-0 overflow-hidden bg-surface">
                      <Image src={item.imagen.src} alt="" fill sizes="168px" className="object-cover" />
                    </span>
                  ) : (
                    <span className="flex aspect-[3/2] w-[38%] max-w-[168px] shrink-0 items-end bg-fg px-3 py-2.5 font-display text-[0.9375rem] leading-tight text-bg">
                      {proyectoDe(item.proyecto)}
                    </span>
                  )}
                  <span className="block min-w-0">
                    <span className="block text-[0.75rem] text-muted">{etiquetaDeConstruido(item)}</span>
                    <span className="mt-1 block font-display text-[1.1875rem] leading-snug text-fg group-hover:text-accent-ink">{item.titulo}</span>
                    <span className="mt-1.5 block text-[0.875rem] leading-relaxed text-chrome">{item.frase}</span>
                  </span>
                </Enlace>
              </li>
            ))}
          </ul>
        </Bloque>
      ) : null}

      {secciones.map((seccion, i) => (
        <Bloque key={seccion.titulo} id={`seccion-${i + 1}`} titulo={<span dangerouslySetInnerHTML={{ __html: seccion.titulo }} />}>
          <Cuerpo html={seccion.html} className="mt-3" />
        </Bloque>
      ))}

      {edicion.boton ? (
        <p className="mt-7">
          <Enlace
            href={edicion.boton.url}
            className="inline-flex min-h-11 items-center bg-accent px-5 font-sans text-[0.9375rem] font-bold text-on-accent hover:bg-accent-strong"
          >
            {edicion.boton.texto}
          </Enlace>
        </p>
      ) : null}

      {skill ? (
        <Bloque id="para-usar" titulo="Para usar esta semana">
          <div className="mt-4 flex flex-col font-sans text-on-accent sm:flex-row" style={{ backgroundColor: skill.color }}>
            {skill.foto ? (
              <span className="relative block aspect-[4/5] w-full shrink-0 sm:w-[200px]">
                <Image src={skill.foto} alt="" fill sizes="(min-width: 640px) 200px, 100vw" className="object-cover" />
              </span>
            ) : null}
            <div className="flex flex-col justify-between gap-5 px-5 py-5">
              <div>
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.08em]">Skill</p>
                <p className="mt-2 font-display text-[1.5rem] leading-tight">{skill.titulo}</p>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed">{skill.texto}</p>
              </div>
              <Link href={skill.href} className="inline-flex min-h-11 items-center self-start bg-panel px-4 text-[0.875rem] font-bold text-fg hover:bg-surface">
                Instalarla en tu agente
              </Link>
            </div>
          </div>
        </Bloque>
      ) : null}

      {noticias ? (
        <Bloque id="lo-que-ha-pasado" titulo={<span dangerouslySetInnerHTML={{ __html: noticias.titulo }} />}>
          <Cuerpo html={noticias.html} className="mt-3" />
        </Bloque>
      ) : null}

      {edicion.pregunta ? (
        <section aria-label="Una pregunta" className="mt-10 border-t border-border pt-5 font-sans text-[1rem] leading-relaxed text-fg">
          <p>
            <strong>Una cosa que te pido:</strong> {edicion.pregunta}
          </p>
          <p className="mt-3.5">
            Lo leo yo.
            <br />
            Kata
          </p>
        </section>
      ) : null}
    </div>
  );
}
