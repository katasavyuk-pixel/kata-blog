"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

// The stages are a real sequence, so they are numbered; no glyph stands in
// for an icon (DESIGN.md, rule 3).
const STAGES = [
  { label: "Tu prompt" },
  { label: "Tokenizar" },
  { label: "Embeddings" },
  { label: "Atención" },
  { label: "Logits" },
  { label: "Sampling" },
  { label: "Texto" },
] as const;

const STEPS: { title: string; body: string }[] = [
  {
    title: "Empiezas con texto",
    body: "Le escribes una frase: «El cielo es de color». Para ti es lenguaje; para el modelo, todavía no significa nada. Hay que convertirlo en números.",
  },
  {
    title: "Se parte en tokens",
    body: "El texto se trocea en tokens (palabras o fragmentos) y cada uno se sustituye por un número de un vocabulario fijo. Es el alfabeto real del modelo.",
  },
  {
    title: "Cada token se vuelve un vector",
    body: "Cada token se convierte en un embedding: una lista de números que sitúa su significado en el espacio. Palabras parecidas caen cerca.",
  },
  {
    title: "Los tokens se miran entre sí",
    body: "El mecanismo de atención deja que cada token pondere a los demás para entender el contexto: «color» mira a «cielo» para resolver de qué hablamos.",
  },
  {
    title: "Sale una puntuación por token posible",
    body: "Tras pasar por las capas, el modelo produce un logit para cada token del vocabulario: cómo de buena candidata es cada palabra para venir ahora.",
  },
  {
    title: "Se elige uno (con algo de azar)",
    body: "Los logits se convierten en probabilidades y se muestrea uno. La temperatura decide si va a lo seguro o se arriesga. Aquí sale «azul».",
  },
  {
    title: "Y vuelta a empezar",
    body: "El token elegido se añade al final y todo el proceso se repite para el siguiente. Palabra a palabra, así se escribe la respuesta entera.",
  },
];

function StageVisual({ stage }: { stage: number }) {
  if (stage === 0) {
    return (
      <p className="border border-border bg-surface px-3 py-2 font-mono text-sm text-fg">
        El cielo es de color
      </p>
    );
  }
  if (stage === 1) {
    return (
      <div className="flex flex-wrap gap-1">
        {["El", "·cielo", "·es", "·de", "·color"].map((t, i) => (
          <span key={i} className={cn("tok-chip", `tok-${i % 4}`)}>
            {t}
          </span>
        ))}
      </div>
    );
  }
  if (stage === 2) {
    const dots = [
      [20, 30],
      [38, 22],
      [30, 55],
      [62, 40],
      [75, 64],
      [50, 72],
    ];
    return (
      <svg viewBox="0 0 100 90" className="h-24 w-full">
        {dots.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={4}
            className={i < 3 ? "fill-[var(--color-accent)]" : "fill-[var(--color-muted)]"}
          />
        ))}
      </svg>
    );
  }
  if (stage === 3) {
    const words = ["El", "cielo", "es", "color"];
    return (
      <svg viewBox="0 0 200 60" className="h-24 w-full">
        <path d="M170 40 Q 110 5 40 40" className="stroke-[var(--color-accent)]" fill="none" strokeWidth={1.5} />
        <path d="M170 40 Q 130 8 110 40" className="stroke-[var(--color-accent)]" fill="none" strokeWidth={1.5} opacity={0.5} />
        {words.map((w, i) => (
          <text
            key={i}
            x={20 + i * 50}
            y={45}
            className={cn(
              "font-mono",
              i === 3 ? "fill-[var(--color-accent-ink)]" : "fill-[var(--color-fg)]",
            )}
            fontSize={11}
            textAnchor="middle"
          >
            {w}
          </text>
        ))}
      </svg>
    );
  }
  if (stage === 4 || stage === 5) {
    const bars = [0.9, 0.45, 0.3, 0.18, 0.1];
    return (
      <ul className="space-y-1.5">
        {["azul", "gris", "negro", "rojo", "verde"].map((tok, i) => (
          <li key={tok} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-right font-mono text-[0.8125rem] text-fg">{tok}</span>
            <span className="relative h-3 flex-1 overflow-hidden rounded bg-surface-2">
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded",
                  stage === 5 && i === 0 ? "bg-accent-strong" : "bg-accent",
                )}
                style={{ width: `${bars[i] * 100}%` }}
              />
            </span>
            {stage === 5 && i === 0 ? (
              <span className="shrink-0 text-[0.75rem] font-semibold text-accent-ink">elegido</span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="border border-border bg-surface px-3 py-2 font-mono text-sm text-fg">
      El cielo es de color <span className="text-accent-ink">azul</span>
    </p>
  );
}

export function LifeOfAPrompt() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="not-prose my-10 flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_19rem] lg:gap-10">
      {/* Sticky scene */}
      <div className="order-1 lg:order-2">
        <div className="sticky top-16 border border-border bg-panel font-sans lg:top-24">
          <div className="p-4">
            <ol className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-[0.75rem]">
              {STAGES.map((s, i) => (
                <li key={s.label} className="flex items-center">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 transition-colors",
                      i === active
                        ? "bg-accent text-on-accent"
                        : i < active
                          ? "text-accent-ink"
                          : "text-muted",
                    )}
                  >
                    {s.label}
                  </span>
                  {i < STAGES.length - 1 ? <Icon name="chevron-right" className="text-faint" /> : null}
                </li>
              ))}
            </ol>
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 border-t border-border pt-4"
            >
              <p className="mb-3 flex items-baseline gap-2 text-[0.9375rem] font-semibold text-fg">
                <span className="tabular-nums text-accent-ink">{active + 1}</span>
                {STAGES[active].label}
              </p>
              <StageVisual stage={active} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scrolling steps */}
      <div className="order-2 lg:order-1">
        {STEPS.map((step, i) => (
          <section
            key={i}
            data-index={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={cn(
              "flex min-h-[55vh] flex-col justify-center border-l-2 pl-5 transition-colors",
              i === active ? "border-accent" : "border-border",
            )}
          >
            <p className="font-sans text-[0.8125rem] font-semibold text-accent-ink">
              Paso {i + 1} · {STAGES[i].label}
            </p>
            <h3 className="mt-2 text-[1.375rem] leading-snug text-fg">
              {step.title}
            </h3>
            <p className="mt-3 text-muted">{step.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
