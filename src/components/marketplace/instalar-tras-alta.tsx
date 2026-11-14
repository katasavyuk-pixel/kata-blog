"use client";

import { useEffect, useState } from "react";
import { Instalar } from "@/components/marketplace/instalar";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { CATALOGO_REPO_URL } from "@/config/catalogo";

const enlace =
  "font-semibold text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

/**
 * The install commands, only after the reader has confirmed the newsletter.
 * The skill sheets stay public, and the repository is public: this gate does
 * not pretend otherwise. Until they confirm, they see the same form as the
 * rest of the site (double opt-in, no new fields).
 */
export function InstalarTrasAlta() {
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
    return <Instalar />;
  }

  return (
    <div className="font-sans">
      <p className="text-[1.0625rem] leading-relaxed">
        El comando de instalación se ve cuando has confirmado el alta en la
        newsletter: como mucho, un correo a la semana, sin compromiso y sin
        tarjeta. Te llega un email para confirmar; cuando lo hagas, vuelve a
        esta página y verás el comando.
      </p>
      <p className="mt-3 text-[1.0625rem] leading-relaxed">
        Las fichas siguen siendo públicas, y el código está en un repositorio
        público:{" "}
        <a href={CATALOGO_REPO_URL} target="_blank" rel="noopener noreferrer" className={enlace}>
          skills-negocio-pequeno en GitHub
        </a>
        . No hace falta suscribirse para leerlo.
      </p>
      <div className="mt-5 max-w-lg">
        <SubscribeForm source="marketplace" />
      </div>
    </div>
  );
}
