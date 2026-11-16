import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/ui/json-ld";
import { datosDe, paginaJsonLd } from "@/lib/jsonld";
import { Container } from "@/components/ui/container";
import { EntregaRegaloAgente } from "@/components/herramientas/regalo-agente-whatsapp";
import { INTRO_AGENTE_WHATSAPP, REGALO_AGENTE_WHATSAPP } from "@/config/regalo-agente-whatsapp";
import { feedAlternates, withOpenGraph } from "@/config/site";

export const metadata: Metadata = withOpenGraph(REGALO_AGENTE_WHATSAPP.href, {
  title: REGALO_AGENTE_WHATSAPP.titulo,
  description: REGALO_AGENTE_WHATSAPP.descripcionMeta,
  alternates: { ...feedAlternates, canonical: REGALO_AGENTE_WHATSAPP.href },
});

const enlace =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";
const etiqueta = "font-sans text-[0.75rem] font-bold uppercase tracking-[0.08em] text-accent-ink";

/**
 * Opt-in page for the WhatsApp receptionist gift. The paste-ready pack is
 * behind the same confirmed-signup gate as the marketplace install command.
 * No Supabase `resource` row: delivery is on this page after /api/confirm.
 */
export default function AgenteWhatsappPage() {
  return (
    <Container className="py-10 sm:py-14">
      <JsonLd
        data={paginaJsonLd({
          path: REGALO_AGENTE_WHATSAPP.href,
          ...datosDe(metadata),
          migas: [
            { name: "Inicio", path: "/" },
            { name: "Recursos", path: "/herramientas" },
            { name: REGALO_AGENTE_WHATSAPP.titulo, path: REGALO_AGENTE_WHATSAPP.href },
          ],
        })}
      />
      <div className="mx-auto max-w-[66ch]">
        <header>
          <p className={etiqueta}>Regalo</p>
          <h1 className="mt-3 text-h1">{REGALO_AGENTE_WHATSAPP.titulo}</h1>
          {INTRO_AGENTE_WHATSAPP.map((parrafo) => (
            <p key={parrafo} className="mt-4 text-lede text-muted">
              {parrafo}
            </p>
          ))}
        </header>

        <p className="mt-6 text-[1.0625rem] leading-relaxed">
          Lo acompaña{" "}
          <Link href="/blog/como-configurar-meta-business-agent-whatsapp-business" className={enlace}>
            cómo configurar Meta Business Agent
          </Link>{" "}
          y el ejemplo para{" "}
          <Link href="/blog/recepcionista-ia-whatsapp-peluqueria" className={enlace}>
            peluquerías
          </Link>
          .
        </p>

        <div className="mt-10">
          <EntregaRegaloAgente />
        </div>
      </div>
    </Container>
  );
}
