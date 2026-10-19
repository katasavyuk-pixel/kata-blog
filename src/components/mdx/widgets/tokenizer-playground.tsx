"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { WidgetFrame } from "./widget-frame";

type EncModule = {
  encode: (text: string) => number[];
  decode: (ids: number[]) => string;
};

// Encodings are loaded on demand (each bundles a sizeable BPE vocab) so they
// never weigh down the initial page — the widget shows a loading state first.
const ENC = {
  o200k_base: {
    label: "GPT-4o · 4o-mini (o200k)",
    load: () => import("gpt-tokenizer/encoding/o200k_base"),
  },
  cl100k_base: {
    label: "GPT-4 · 3.5 (cl100k)",
    load: () => import("gpt-tokenizer/encoding/cl100k_base"),
  },
} as const;
type EncKey = keyof typeof ENC;

const DEFAULT_TEXT = "Hola, soy Kata. La IA no lee palabras: lee tokens 👋";
const PRICE_PER_M = 2.5; // $/M tokens (~GPT-4o input, ilustrativo)

export function TokenizerPlayground() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [encKey, setEncKey] = useState<EncKey>("o200k_base");
  const [enc, setEnc] = useState<EncModule | null>(null);
  const cache = useRef<Partial<Record<EncKey, EncModule>>>({});

  useEffect(() => {
    let active = true;
    const cached = cache.current[encKey];
    if (cached) {
      setEnc(cached);
      return;
    }
    setEnc(null);
    ENC[encKey].load().then((m) => {
      if (!active) return;
      const mod: EncModule = { encode: m.encode, decode: m.decode };
      cache.current[encKey] = mod;
      setEnc(mod);
    });
    return () => {
      active = false;
    };
  }, [encKey]);

  const tokens = useMemo(() => {
    if (!enc || !text) return [];
    return enc.encode(text).map((id) => ({ id, text: enc.decode([id]) }));
  }, [enc, text]);

  const count = tokens.length;
  const costPer1k = ((count * 1000) / 1_000_000) * PRICE_PER_M;

  return (
    <WidgetFrame
      title="Tokenizer"
      onReset={() => setText(DEFAULT_TEXT)}
      caption="Los modelos no leen palabras ni letras: leen tokens. Escribe lo que quieras y mira cómo se parte. El coste es aproximado, a título ilustrativo."
    >
      <label htmlFor="tok-input" className="sr-only">
        Texto a tokenizar
      </label>
      <textarea
        id="tok-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        spellCheck={false}
        className="w-full resize-y rounded-sm border border-border bg-panel p-3 font-mono text-sm text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        placeholder="Escribe aquí…"
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <select
          value={encKey}
          onChange={(event) => setEncKey(event.target.value as EncKey)}
          aria-label="Codificación / modelo"
          className="min-h-11 rounded-sm border border-border bg-panel px-3 text-[0.9375rem] text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        >
          {Object.entries(ENC).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
        <span className="text-[0.9375rem] text-muted">
          <strong className="text-[1.125rem] font-semibold tabular-nums text-fg">{count}</strong> tokens
        </span>
        <span className="text-[0.8125rem] text-muted">
          ≈ ${costPer1k.toFixed(3)} / 1.000 usos
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border border-border bg-surface p-3">
        {!enc ? (
          <span className="text-sm text-muted">Cargando tokenizador…</span>
        ) : tokens.length === 0 ? (
          <span className="text-sm text-muted">Escribe algo arriba.</span>
        ) : (
          tokens.map((token, i) => (
            <span
              key={i}
              className={cn("tok-chip", `tok-${i % 4}`)}
              title={`token id ${token.id}`}
            >
              {token.text === ""
                ? "∅"
                : token.text.replace(/ /g, "·").replace(/\n/g, "↵")}
            </span>
          ))
        )}
      </div>
    </WidgetFrame>
  );
}
