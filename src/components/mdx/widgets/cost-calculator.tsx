"use client";

import { useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { Param } from "./param";
import { WidgetFrame } from "./widget-frame";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { Icon } from "@/components/ui/icon";
import { formatDate } from "@/lib/format";
import {
  COST_DEFAULTS,
  COST_LIMITS,
  COST_MAGNET_SLUG,
  COST_MODELS_OFFERED,
  COST_PRICE_SOURCES,
  COST_PRICES_CHECKED,
  computeCost,
  formatCost,
} from "@/lib/cost-model";

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`min-w-0 border-t-2 pt-2 ${accent ? "border-accent" : "border-border"}`}>
      <p className="text-[0.8125rem] text-muted">{label}</p>
      <p
        className={`mt-1 text-[1.375rem] font-semibold leading-tight ${accent ? "text-accent-ink" : "text-fg"}`}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Cost calculator.
 *
 * `captureMode` is off by default, and off means the rendered tree is exactly
 * what it has always been — the article that hosts this widget must not change
 * because /recursos wanted a lead magnet. On /recursos it turns on an email
 * capture *below* the result.
 *
 * The order matters and is not negotiable: the reader sees every number first,
 * without giving anything. The site promises "sin registro" and the whole
 * argument of this blog is that the numbers are real and checkable. Gating the
 * result would trade the one thing that makes the calculator persuasive for a
 * few addresses. The email buys delivery — the breakdown in writing and a
 * template to redo it on their own project — not access.
 */
export function CostCalculator({
  captureMode = false,
  source = "recursos",
}: {
  captureMode?: boolean;
  /** Attribution bucket for the capture. `post-inline` when inside an article. */
  source?: string;
}) {
  const [modelId, setModelId] = useState(COST_DEFAULTS.modelId);
  const [inTok, setInTok] = useState(COST_DEFAULTS.inTok);
  const [outTok, setOutTok] = useState(COST_DEFAULTS.outTok);
  const [reqs, setReqs] = useState(COST_DEFAULTS.reqs);

  // Usage without an email is invisible to the server by design, so the only
  // honest way to know how many people actually touch this is a cookieless,
  // PII-free custom event. Once per mount: we want users, not slider drags.
  const tracked = useRef(false);
  const markUsed = () => {
    if (tracked.current) return;
    tracked.current = true;
    track("calculadora_usada");
  };

  const inputs = { modelId, inTok, outTok, reqs };
  const { model, perReq, perDay, perMonth } = computeCost(inputs);
  const shown = formatCost({ model, perReq, perDay, perMonth });

  return (
    <WidgetFrame
      title="Coste"
      onReset={() => {
        setModelId(COST_DEFAULTS.modelId);
        setInTok(COST_DEFAULTS.inTok);
        setOutTok(COST_DEFAULTS.outTok);
        setReqs(COST_DEFAULTS.reqs);
      }}
      caption={`Precios de lista en dólares por millón de tokens, leídos el ${formatDate(COST_PRICES_CHECKED)} en las páginas de precios de ${COST_PRICE_SOURCES.map((s) => s.proveedor).join(" y ")}. Sin caché ni descuentos: es una estimación. Fíjate en cómo el coste de salida y la elección de modelo dominan la factura.`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cost-model" className="text-[0.9375rem] font-medium text-fg">
            Modelo
          </label>
          <select
            id="cost-model"
            value={modelId}
            onChange={(e) => {
              markUsed();
              setModelId(e.target.value as typeof modelId);
            }}
            className="min-h-11 rounded-sm border border-border bg-panel px-3 text-[0.9375rem] text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
          >
            {COST_MODELS_OFFERED.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} (${m.in} / ${m.out} por M)
              </option>
            ))}
          </select>
        </div>
        <Param
          label="Tokens de entrada"
          value={inTok}
          {...COST_LIMITS.inTok}
          onChange={(v) => {
            markUsed();
            setInTok(v);
          }}
        />
        <Param
          label="Tokens de salida"
          value={outTok}
          {...COST_LIMITS.outTok}
          onChange={(v) => {
            markUsed();
            setOutTok(v);
          }}
        />
        <Param
          label="Peticiones / día"
          value={reqs}
          {...COST_LIMITS.reqs}
          onChange={(v) => {
            markUsed();
            setReqs(v);
          }}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <Stat label="Por petición" value={shown.perReq} />
        <Stat label="Por día" value={shown.perDay} />
        <Stat label="Por mes" value={shown.perMonth} accent />
      </div>

      {captureMode ? (
        <div id="suscripcion" className="mt-5 scroll-mt-24 border-t border-border pt-5">
          <p className="flex items-center gap-2 text-[1.0625rem] font-semibold text-fg">
            <Icon name="mail" className="text-accent-ink" />
            ¿Te mando este cálculo por escrito?
          </p>
          <p className="mt-2 max-w-[60ch] text-[0.875rem] leading-relaxed text-muted">
            Tu desglose con estos números y la fórmula, para rehacerlo con los
            precios y el volumen de tu propio proyecto en una hoja de cálculo.
            Un email, sin más pasos.
          </p>
          <div className="mt-4">
            <SubscribeForm
              source={source}
              magnetSlug={COST_MAGNET_SLUG}
              payload={() => ({ ...inputs })}
              submitLabel="Enviármelo"
              layout="inline"
              doneMessage="Hecho. Confirma en tu correo y te llega el desglose (doble opt-in)."
              consentLabel={
                <>
                  Acepto recibir el desglose y la newsletter, y la{" "}
                  <a href="/privacidad" className="text-accent-ink underline">
                    política de privacidad
                  </a>
                  . Es una sola lista: te mando el desglose y te quedas suscrito.
                  Te llega un email para confirmar, y bajas en un clic desde
                  cualquiera de ellos.
                </>
              }
            />
          </div>
        </div>
      ) : null}
    </WidgetFrame>
  );
}
