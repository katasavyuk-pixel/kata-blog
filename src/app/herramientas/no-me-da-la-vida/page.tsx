import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { datosDe, paginaJsonLd } from "@/lib/jsonld";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { NoMeDaLaVida } from "@/components/tools/no-me-da-la-vida";
import { feedAlternates, withOpenGraph } from "@/config/site";

export const metadata: Metadata = withOpenGraph(
  "/herramientas/no-me-da-la-vida",
  {
    title: "No me da la vida",
    description:
      "Convierte tu lista de tareas en un plan realista de 25 minutos. Sin cuentas, sin dividir tareas y sin pasarte de tiempo.",
    alternates: { ...feedAlternates, canonical: "/herramientas/no-me-da-la-vida" },
  },
  // The shared card gets a title and a line written for it.
  {
    title: "No me da la vida · un plan de 25 minutos",
    description: "Una herramienta sencilla para decidir qué cabe hoy y aparcar el resto sin culpa.",
  },
);

const linkClass =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

const PASOS = [
  {
    titulo: "Vacía la cabeza",
    texto: "Añade las tareas tal como te vienen, con un tiempo aproximado.",
  },
  {
    titulo: "Mira el bloque",
    texto:
      "El plan respeta el orden, incluye solo tareas completas y se queda dentro de 25 minutos.",
  },
  {
    titulo: "Aparca sin ruido",
    texto:
      "Cada tarea fuera lleva una explicación: supera el bloque o ya no cabía en el tiempo restante.",
  },
] as const;

export default function NoMeDaLaVidaPage() {
  return (
    <Container size="wide" className="py-10 sm:py-14">
      <JsonLd
        data={paginaJsonLd({
          path: "/herramientas/no-me-da-la-vida",
          ...datosDe(metadata),
          migas: [
            { name: "Inicio", path: "/" },
            { name: "Recursos", path: "/herramientas" },
            { name: "No me da la vida", path: "/herramientas/no-me-da-la-vida" },
          ],
        })}
      />
      <header className="max-w-[66ch]">
        <Eyebrow>
          <Link href="/herramientas" className="hover:text-accent-ink">
            Herramienta
          </Link>{" "}
          <span aria-hidden>·</span> gratis <span aria-hidden>·</span> sin cuenta
        </Eyebrow>
        <h1 className="mt-3 text-h1">No me da la vida.</h1>
        <p className="mt-4 text-muted">
          Un plan de 25 minutos para avanzar sin fingir que hoy caben treinta horas.
        </p>
        <p className="mt-3 text-muted">
          Escribe lo que tienes pendiente, estima cuánto necesita cada cosa y deja que el sistema te enseñe qué entra en tu bloque. Lo demás queda aparcado con una razón concreta.
        </p>
      </header>

      <div className="mt-10">
        <NoMeDaLaVida />
      </div>

      <section aria-labelledby="como-funciona" className="mt-12 border-t border-border pt-6 font-sans">
        <h2 id="como-funciona" className="text-h2">
          Cómo funciona
        </h2>
        {/* The order is the method, so the steps are an ordered list. */}
        <ol className="mt-5 grid gap-6 sm:grid-cols-3">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="border-t border-border pt-4">
              <h3 className="text-[1rem]">
                <span className="mr-2 font-sans text-[0.8125rem] font-semibold text-accent-ink">{i + 1}</span>
                {paso.titulo}
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-12 max-w-[66ch] border-t border-border pt-6 font-sans text-[0.9375rem] leading-relaxed text-muted">
        Esta herramienta acompaña al artículo{" "}
        <Link href="/blog/no-me-da-la-vida" className={linkClass}>
          No me da la vida: hacer menos también es un sistema
        </Link>
        . Si quieres recibir los sistemas nuevos antes que nadie,{" "}
        <Link href="/newsletter#suscribirse" className={linkClass}>
          apúntate a la newsletter
        </Link>
        .
      </p>
    </Container>
  );
}
