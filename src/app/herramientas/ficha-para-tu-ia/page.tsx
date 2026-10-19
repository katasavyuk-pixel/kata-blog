import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { datosDe, paginaJsonLd } from "@/lib/jsonld";
import { Container } from "@/components/ui/container";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { Copiar } from "@/components/tools/copiar";
import { DONDE_SE_PEGA, FICHA, PRIMERA_TAREA, REGALO } from "@/config/regalo";
import { feedAlternates, withOpenGraph } from "@/config/site";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = withOpenGraph(
  REGALO.ficha.href,
  {
    title: "Tu ficha para la IA",
    description:
      "Una plantilla que rellenas una vez y pegas en ChatGPT, Claude o Gemini para que te respondan sabiendo quién eres y cómo trabajas. Gratis, en cinco minutos.",
    alternates: { ...feedAlternates, canonical: REGALO.ficha.href },
  },
  // The shared card gets the shorter line, written for it.
  { description: "Rellénala una vez y la IA deja de empezar de cero cada vez que le pides algo." },
);

const enlace =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";
const etiqueta = "font-sans text-[0.75rem] font-bold uppercase tracking-[0.08em] text-accent-ink";

/**
 * Half of the signup gift, «Recupera horas de tu semana con IA» (src/config/regalo.ts):
 * the profile anyone can copy, and the form for the other half, the sheet of
 * their week. Open to everyone on purpose: the profile is the part that makes
 * the AI useful, and it costs nothing to give.
 */
export default function FichaParaTuIaPage() {
  return (
    <Container className="py-10 sm:py-14">
      <JsonLd
        data={paginaJsonLd({
          path: REGALO.ficha.href,
          ...datosDe(metadata),
          migas: [
            { name: "Inicio", path: "/" },
            { name: "Recursos", path: "/herramientas" },
            { name: "Tu ficha para la IA", path: REGALO.ficha.href },
          ],
        })}
      />
      <div className="mx-auto max-w-[66ch]">
        <header>
          <p className={etiqueta}>{REGALO.titulo}</p>
          <h1 className="mt-3 text-h1">Tu ficha para la IA</h1>
          <p className="mt-4 text-lede text-muted">
            Rellénala una vez, en cinco minutos, y pégala donde tu IA guarda las instrucciones. A partir de ahí,
            cada respuesta parte de quién eres y de cómo trabajas, en vez de empezar de cero.
          </p>
        </header>

        <section aria-labelledby="la-ficha" className="mt-10 border-t-[3px] border-accent pt-3">
          <h2 id="la-ficha" className={etiqueta}>
            La ficha
          </h2>
          <p className="mt-3 font-sans text-[0.9375rem] text-muted">Cópiala y cambia lo que va entre corchetes.</p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap bg-surface p-5 font-sans normal-nums text-[0.9375rem] leading-relaxed text-fg">
            {FICHA}
          </pre>
          <p className="mt-4">
            <Copiar texto={FICHA} etiqueta="Copiar la ficha" />
          </p>
          <p className="mt-4 font-sans text-[0.8125rem] leading-relaxed text-muted">
            Ocupa unos 900 caracteres sin rellenar. ChatGPT admite 1.500 en la versión gratuita: si no te cabe, acorta
            «Para qué te voy a usar».
          </p>
        </section>

        <section aria-labelledby="donde" className="mt-10 border-t-[3px] border-accent pt-3">
          <h2 id="donde" className={etiqueta}>
            Dónde se pega
          </h2>
          <ul className="mt-4 space-y-3 font-sans text-[0.9375rem] leading-relaxed text-fg">
            {DONDE_SE_PEGA.asistentes.map((asistente) => (
              <li key={asistente.nombre}>
                <strong>{asistente.nombre}:</strong> {asistente.pasos}
              </li>
            ))}
            <li>
              <strong>Si no encuentras el sitio</strong>, pega la ficha al principio de la conversación y añade: «Esta es
              mi ficha. Tenla en cuenta en todo lo que te pida».
            </li>
          </ul>
          <p className="mt-4 font-sans text-[0.8125rem] leading-relaxed text-muted">
            No pongas contraseñas, datos de clientes ni nada que no le contarías a un desconocido: lo que escribes ahí lo
            guarda el servicio. Comprobado el {formatDate(DONDE_SE_PEGA.comprobado)} en la ayuda de{" "}
            {DONDE_SE_PEGA.asistentes.map((asistente, i) => (
              <span key={asistente.nombre}>
                {i > 0 ? (i === DONDE_SE_PEGA.asistentes.length - 1 ? " y " : ", ") : null}
                <a href={asistente.fuente} target="_blank" rel="noopener noreferrer" className={enlace}>
                  {asistente.nombre}
                </a>
              </span>
            ))}
            . Los menús cambian a menudo: si no lo encuentras, busca «instrucciones» en los ajustes.
          </p>
        </section>

        <section aria-labelledby="primera-tarea" className="mt-10 border-t-[3px] border-accent pt-3">
          <h2 id="primera-tarea" className={etiqueta}>
            Y ahora, la primera tarea
          </h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed">
            Con la ficha puesta, pásale a tu IA la tarea que más horas te come. Cámbiale lo que va entre corchetes:
          </p>
          <blockquote className="mt-4 border-l-[3px] border-accent bg-surface px-5 py-4 font-sans text-[0.9375rem] italic leading-relaxed text-fg">
            «{PRIMERA_TAREA}»
          </blockquote>
          <p className="mt-4">
            <Copiar texto={PRIMERA_TAREA} etiqueta="Copiar el mensaje" />
          </p>
        </section>

        <section
          id="hoja"
          aria-labelledby="la-hoja"
          className="mt-12 bg-surface px-5 py-6 sm:px-7"
        >
          <h2 id="la-hoja" className="font-sans text-[1.0625rem] font-bold text-fg">
            ¿Cuál es la tarea que más horas te come? {REGALO.hoja.titulo} te lo dice
          </h2>
          <p className="mt-2 font-sans text-[0.9375rem] leading-relaxed text-muted">
            Apuntas tus tareas repetitivas, del trabajo o de casa, y te devuelve cuántas horas al año se te van en cada
            una, cuántas te puede devolver la IA y por cuál empezar. Si pones cuánto vale tu hora, también en euros. Te la
            mando al correo con la newsletter: como mucho, un correo a la semana.
          </p>
          <div className="mt-4">
            <SubscribeForm source="ficha-ia" resource={REGALO.hoja.slug} submitLabel="Mándame la hoja" />
          </div>
        </section>
      </div>
    </Container>
  );
}
