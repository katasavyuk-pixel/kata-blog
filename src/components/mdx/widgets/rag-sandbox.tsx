"use client";

import { useId, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { retrievalScore } from "@/lib/rag-sandbox";
import { Param } from "./param";
import { WidgetFrame } from "./widget-frame";

/**
 * RagSandbox — the retrieval half of RAG, playable.
 *
 * The course promises "no lees cómo funciona: mueves los mandos y lo ves", and
 * this was the only lesson without an island. The island plays the step that
 * decides whether RAG works at all: retrieval. You ask, every chunk gets
 * scored, the top-k above zero become the context the model would see.
 *
 * Honesty contract (same as every widget here):
 * - The corpus is real: sentences lifted from this site's published content,
 *   so nothing in the demo is invented data posing as fact.
 * - The scorer is lexical (term overlap), computed live in the browser — the
 *   transparent cousin of an embedding. Production RAG scores by meaning;
 *   this scores by words. The caption and the math panel say so explicitly,
 *   because a demo that implies otherwise would be the site arguing with
 *   itself. The arithmetic lives in src/lib/rag-sandbox.ts and is fixed by
 *   tests/rag-sandbox.test.ts.
 * - No model call, no API, no pre-baked answers: what you see is arithmetic
 *   you can reproduce by hand.
 */

/** Chunks are near-verbatim lines from published posts, glossary and pages. */
const CHUNKS: { text: string; source: string }[] = [
  {
    text: "En los siete modelos de la tabla, un token de salida cuesta cinco veces lo que uno de entrada; pedir respuestas más cortas es la optimización de coste más fácil.",
    source: "cuanto-cuesta-la-ia",
  },
  {
    text: "La temperatura controla la aleatoriedad de la generación: cerca de 0 es determinista y conservador; alta, más diverso y caótico.",
    source: "glosario",
  },
  {
    text: "Las Noticias salen cada día con lo importante, verificado contra su fuente por un pipeline anti-alucinación.",
    source: "noticias",
  },
  {
    text: "Un token es la unidad mínima que procesa un modelo de lenguaje: trozos de palabra, no letras ni palabras enteras.",
    source: "que-es-un-token",
  },
  {
    text: "Una alucinación es una respuesta plausible pero falsa, dicha con total seguridad; fluido no es lo mismo que correcto.",
    source: "cuando-la-ia-alucina",
  },
  {
    text: "La ventana de contexto es la cantidad máxima de tokens que el modelo puede tener en cuenta a la vez; si te pasas, se trunca.",
    source: "glosario",
  },
  {
    text: "MaitreAI atiende reservas por WhatsApp y voz en un restaurante real de Irun.",
    source: "como-hice-maitreai",
  },
  {
    text: "El curso interactivo de IA tiene lecciones en orden, gratis y sin registro, con el progreso guardado en tu navegador.",
    source: "empieza-aqui",
  },
];

const PRESETS = [
  "¿Cuánto cuestan los tokens?",
  "¿Qué es una alucinación?",
  "¿Cada cuánto salen las Noticias?",
  "¿Qué hace MaitreAI?",
  "¿Qué es la temperatura?",
];

const inputClass =
  "w-full rounded-sm border border-border bg-panel px-3 py-2 text-[0.9375rem] text-fg placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]";

const chipClass =
  "rounded-full border border-border bg-panel px-3 py-1 text-[0.8125rem] text-muted transition-colors hover:border-accent-ink hover:text-fg aria-pressed:border-accent-ink aria-pressed:bg-surface aria-pressed:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]";

export function RagSandbox() {
  const [question, setQuestion] = useState(PRESETS[0]);
  const [topK, setTopK] = useState(2);
  const preguntaId = useId();

  // Ranked once per question: index + score, descending, stable on ties.
  const ranked = useMemo(() => {
    const scored = CHUNKS.map((chunk, i) => ({
      i,
      chunk,
      score: retrievalScore(question, chunk.text),
    }));
    return scored.sort((a, b) => b.score - a.score || a.i - b.i);
  }, [question]);

  // Retrieved = the top-k cut, but only chunks that matched something. A
  // k of 3 with two zero-score chunks retrieves two — top-k over zeros would
  // hand the model irrelevant text, which is exactly the failure this knob
  // teaches you to avoid.
  const retrieved = ranked
    .filter((r) => r.score > 0)
    .slice(0, topK);
  const retrievedSet = new Set(retrieved.map((r) => r.i));

  return (
    <WidgetFrame
      title="RAG · recuperación"
      onReset={() => {
        setQuestion(PRESETS[0]);
        setTopK(2);
      }}
      math={
        <p>
          Cada fragmento se puntúa como{" "}
          <code className="font-mono">
            aciertos / términos_de_la_pregunta
          </code>{" "}
          tras quitar tildes, signos, palabras vacías y plurales (la versión
          ingenua y transparente de lo que un embedding hace con significado).
          Se recuperan los <em>k</em> primeros con puntuación &gt; 0.
        </p>
      }
      caption="Pregunta, mira qué fragmentos se recuperan y con qué puntuación — y cómo cambia el contexto que recibiría el modelo al mover el top-k. La similitud aquí es léxica (coincidencia de términos), calculada en tu navegador; en producción la calcula un embedding sobre el significado. Los fragmentos son frases reales de este sitio."
    >
      {/* Question input + presets */}
      <label htmlFor={preguntaId} className="block text-[0.8125rem] font-semibold text-muted">
        Tu pregunta
      </label>
      <input
        id={preguntaId}
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className={`mt-1.5 ${inputClass}`}
        placeholder="Pregunta algo sobre el contenido…"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setQuestion(preset)}
            className={chipClass}
            aria-pressed={question === preset}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* The knob */}
      <div className="mt-4">
        <Param
          label="Fragmentos a recuperar (top-k)"
          value={topK}
          min={1}
          max={4}
          step={1}
          onChange={setTopK}
          format={(v) => v.toFixed(0)}
        />
      </div>

      {/* Scored corpus */}
      <ul className="mt-4 space-y-1.5" aria-label="Fragmentos puntuados">
        {ranked.map((r, rank) => {
          const isRetrieved = retrievedSet.has(r.i);
          return (
            <li
              key={r.i}
              className={
                isRetrieved
                  ? "border border-accent/60 bg-surface p-2.5"
                  : "border border-border p-2.5"
              }
            >
              <div className="flex items-center gap-2">
                <span className="text-[0.75rem] tabular-nums text-faint">
                  #{r.i + 1}
                </span>
                <span className="relative h-3.5 flex-1 overflow-hidden rounded bg-surface-2">
                  <span
                    className={
                      isRetrieved
                        ? "absolute inset-y-0 left-0 rounded bg-accent transition-[width]"
                        : "absolute inset-y-0 left-0 rounded bg-faint/60 transition-[width]"
                    }
                    style={{ width: `${r.score * 100}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right text-[0.8125rem] tabular-nums text-muted">
                  {(r.score * 100).toFixed(0)}%
                </span>
                {isRetrieved ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-accent-ink">
                    <Icon name="check" />
                    En el contexto
                  </span>
                ) : null}
              </div>
              <p className={`mt-1.5 text-[0.9375rem] leading-relaxed ${isRetrieved ? "text-fg" : "text-muted"}`}>
                {r.chunk.text}
              </p>
              <p className="mt-0.5 text-[0.75rem] text-faint">
                Fuente: {r.chunk.source}
                {rank === 0 && r.score === 0 ? " · ninguna coincidencia" : ""}
              </p>
            </li>
          );
        })}
      </ul>

      {/* The assembled prompt — what the model would actually receive */}
      <div className="mt-5">
        <p className="text-[0.8125rem] font-semibold text-muted">
          Lo que recibiría el modelo
        </p>
        <pre className="mt-1.5 max-h-56 overflow-auto border border-border bg-surface-2 p-3 font-mono text-xs leading-relaxed text-fg">
{`Responde solo con el contexto.

Contexto:
${
  retrieved.length > 0
    ? retrieved
        .map((r) => `[${r.i + 1}] ${r.chunk.text}`)
        .join("\n")
    : "(nada recuperado: sin coincidencias, el modelo respondería de memoria)"
}

Pregunta: ${question.trim() || "…"}`}
        </pre>
        {retrieved.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Sin coincidencias no hay contexto — y un modelo sin contexto responde
            desde lo que recuerda. Ese es exactamente el hueco donde nacen las
            alucinaciones.
          </p>
        ) : null}
      </div>
    </WidgetFrame>
  );
}
