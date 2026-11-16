"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { Copiar } from "@/components/tools/copiar";
import {
  ANADIDOS,
  AVISO_META,
  BLOQUE_AGENTE,
  COMO_USAR,
  FUENTE_PASOS,
  PASOS,
  PASOS_MAITRE,
  PRUEBAS,
  PRUEBAS_INTRO,
  REGALO_AGENTE_WHATSAPP,
} from "@/config/regalo-agente-whatsapp";

const enlace =
  "font-semibold text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";
const etiqueta = "font-sans text-[0.75rem] font-bold uppercase tracking-[0.08em] text-accent-ink";
const pre =
  "mt-4 overflow-x-auto whitespace-pre-wrap bg-surface p-5 font-sans normal-nums text-[0.9375rem] leading-relaxed text-fg";

/**
 * The paste-ready pack, only after the reader has confirmed the newsletter.
 * Same gate as the marketplace install commands: GET /api/alta, and the same
 * SubscribeForm (double opt-in, no new fields, no Supabase `resource`).
 */
export function EntregaRegaloAgente() {
  const [estado, setEstado] = useState<"cargando" | "alta" | "pendiente">("cargando");

  useEffect(() => {
    let cancelado = false;
    fetch("/api/alta", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { confirmada: false }))
      .then((data: { confirmada?: boolean }) => {
        if (!cancelado) setEstado(data.confirmada ? "alta" : "pendiente");
      })
      .catch(() => {
        if (!cancelado) setEstado("pendiente");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (estado === "cargando") {
    return (
      <p className="font-sans text-[0.9375rem] text-muted" role="status">
        Un momento…
      </p>
    );
  }

  if (estado === "alta") {
    return <ContenidoRegaloAgente />;
  }

  return (
    <div className="font-sans">
      <p className="text-[1.0625rem] leading-relaxed">
        El texto para pegar se ve cuando has confirmado el alta en la newsletter:
        como mucho, un correo a la semana, sin compromiso y sin tarjeta. Te llega
        un email para confirmar; cuando lo hagas, vuelve a esta página y verás el
        texto.
      </p>
      <div className="mt-5 max-w-lg">
        <SubscribeForm source={REGALO_AGENTE_WHATSAPP.source} />
      </div>
    </div>
  );
}

function ContenidoRegaloAgente() {
  return (
    <div>
      <section aria-labelledby="como-usar" className="border-t-[3px] border-accent pt-3">
        <h2 id="como-usar" className={etiqueta}>
          Cómo usar este documento
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 font-sans text-[0.9375rem] leading-relaxed text-fg">
          {COMO_USAR.map((paso) => (
            <li key={paso} className="pl-1">
              {paso}
            </li>
          ))}
        </ol>
        <p className="mt-4 font-sans text-[0.8125rem] leading-relaxed text-muted">{AVISO_META}</p>
      </section>

      <section aria-labelledby="pasos" className="mt-10 border-t-[3px] border-accent pt-3">
        <h2 id="pasos" className={etiqueta}>
          Pasos de configuración
        </h2>
        <p className="mt-3 font-sans text-[0.8125rem] leading-relaxed text-muted">{FUENTE_PASOS}</p>
        <ol className="mt-6 space-y-6">
          {PASOS.map((paso) => (
            <li key={paso.titulo}>
              <h3 className="font-display text-h3 font-semibold leading-tight text-fg">{paso.titulo}</h3>
              <p className="mt-2 text-[1.0625rem] leading-relaxed">{paso.cuerpo}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <h3 className="font-display text-h3 font-semibold leading-tight text-fg">{PASOS_MAITRE.titulo}</h3>
          <p className="mt-2 text-[1.0625rem] leading-relaxed">
            Puedes probar Maître en{" "}
            <a href="https://maitreai.es" target="_blank" rel="noopener noreferrer" className={enlace}>
              maitreai.es
            </a>
            : el plan de entrada es gratis y no pide tarjeta (página de reservas y
            agenda; WhatsApp no va en ese plan). En los planes de pago hay prueba
            de 14 días; piden tarjeta y no cobran hasta el día 15 si cancelas
            antes. Precios y condiciones:{" "}
            <a href="https://maitreai.es/precios" target="_blank" rel="noopener noreferrer" className={enlace}>
              maitreai.es/precios
            </a>
            . Si prefieres que te lo monte, está en{" "}
            <Link href="/trabaja-con-nbi" className={enlace}>
              trabaja con NBI
            </Link>
            .
          </p>
        </div>
      </section>

      <section aria-labelledby="bloque" className="mt-10 border-t-[3px] border-accent pt-3">
        <h2 id="bloque" className={etiqueta}>
          Texto para pegar (bloque completo)
        </h2>
        <p className="mt-3 font-sans text-[0.9375rem] text-muted">
          Copia desde «INICIO DEL AGENTE» hasta «FIN DEL AGENTE». Rellena antes los
          campos.
        </p>
        <pre className={pre}>{BLOQUE_AGENTE}</pre>
        <p className="mt-4">
          <Copiar texto={BLOQUE_AGENTE} etiqueta="Copiar el bloque" />
        </p>
      </section>

      <section aria-labelledby="anadidos" className="mt-10 border-t-[3px] border-accent pt-3">
        <h2 id="anadidos" className={etiqueta}>
          Añadidos según el tipo de negocio
        </h2>
        <p className="mt-3 text-[1.0625rem] leading-relaxed">
          Pega debajo del bloque, solo el que te corresponda. Si no encaja, no lo
          pongas.
        </p>
        {ANADIDOS.map((anadido) => (
          <div key={anadido.titulo} className="mt-8">
            <h3 className="font-display text-h3 font-semibold leading-tight text-fg">{anadido.titulo}</h3>
            <pre className={pre}>{anadido.texto}</pre>
            <p className="mt-4">
              <Copiar texto={anadido.texto} etiqueta="Copiar el añadido" />
            </p>
          </div>
        ))}
      </section>

      <section aria-labelledby="pruebas" className="mt-10 border-t-[3px] border-accent pt-3">
        <h2 id="pruebas" className={etiqueta}>
          Pruebas (hazlas antes de activarlo)
        </h2>
        <p className="mt-3 text-[1.0625rem] leading-relaxed">{PRUEBAS_INTRO}</p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 font-sans text-[0.9375rem] leading-relaxed text-fg">
          {PRUEBAS.map((prueba) => (
            <li key={prueba} className="pl-1">
              {prueba}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
