import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { datosDe, paginaJsonLd } from "@/lib/jsonld";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";

export const metadata: Metadata = withOpenGraph("/privacidad", {
  title: "Política de privacidad",
  description:
    "Cómo trata kata.ianexora.com tus datos: quién es el responsable, qué datos guarda y para qué, qué proveedores intervienen, cuánto tiempo y tus derechos.",
  alternates: { ...feedAlternates, canonical: "/privacidad" },
});

// TODO(katamv): revisar con tu asesor el responsable y la dirección.
const CONTACT_EMAIL = siteConfig.contactEmail;

export default function PrivacyPage() {
  return (
    <Container className="py-10 sm:py-14">
      <JsonLd data={paginaJsonLd({ path: "/privacidad", ...datosDe(metadata) })} />
      <div className="mx-auto max-w-[66ch]">
        <h1 className="text-h1">
          Política de privacidad
        </h1>
        <Prose className="mt-6">
          <h2>Responsable del tratamiento</h2>
          <p>
            {siteConfig.author.name} ({siteConfig.domain}). Para cualquier asunto
            relacionado con tus datos, escribe a{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <h2>Qué datos trato y con qué fin</h2>
          <p>
            Si te suscribes a la newsletter, trato tu <strong>correo electrónico</strong>{" "}
            con la única finalidad de enviarte contenidos y recursos sobre
            inteligencia artificial. Para acreditar tu consentimiento guardo
            también la <strong>fecha</strong>, la <strong>dirección IP</strong> y el{" "}
            <strong>origen</strong> de la suscripción, incluida la{" "}
            <strong>página desde la que te suscribiste</strong>. No pido más
            datos de los necesarios.
          </p>
          <p>
            Si usas una de las herramientas del sitio (por ejemplo, la
            calculadora de costes de IA) y pides que te envíe el resultado,
            guardo junto a tu correo <strong>los parámetros que
            introdujiste y el cálculo resultante</strong>, con la única finalidad
            de poder enviártelo por escrito. Usar la herramienta no requiere dar
            ningún dato: solo se guarda si pides el envío.
          </p>

          <h2>Base legal</h2>
          <p>
            El tratamiento se basa en tu <strong>consentimiento</strong> (art. 6.1.a
            RGPD), que prestas marcando la casilla del formulario. Uso{" "}
            <strong>doble opt-in</strong>: solo te envío la newsletter después de
            que confirmes tu suscripción desde un email.
          </p>

          <h2>Encargados y transferencias internacionales</h2>
          <p>
            Me apoyo en proveedores que actúan como encargados del tratamiento:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> (base de datos, región UE — Frankfurt): almacena
              la lista de suscriptores.
            </li>
            <li>
              <strong>Resend</strong> (envío de email): el envío se realiza desde
              infraestructura de la UE, pero parte de los metadatos y registros se
              procesan en <strong>EE. UU.</strong> al amparo de las{" "}
              <strong>Cláusulas Contractuales Tipo</strong> de la Comisión Europea y de
              un acuerdo de tratamiento de datos (DPA).
            </li>
            <li>
              <strong>Vercel</strong> (hosting del sitio).
            </li>
          </ul>
          <p>
            Por tanto, existe una <strong>transferencia internacional</strong> de datos
            a EE. UU. cubierta por garantías adecuadas. No afirmo un tratamiento
            «100% en la UE».
          </p>

          <h2>Conservación</h2>
          <p>
            Conservo tus datos mientras sigas suscrito. Si te das de baja, dejo de
            enviarte correos de inmediato y elimino tus datos cuando ya no son
            necesarios. La supresión alcanza también a los cálculos que hayas
            pedido por email: se borran con tu dirección, no se conservan aparte.
          </p>

          <h2>Tus derechos</h2>
          <p>
            Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición,
            limitación y portabilidad escribiendo a{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Darte de baja es tan
            fácil como suscribirte: cada email incluye un enlace de{" "}
            <strong>cancelación en un clic</strong>. También tienes derecho a reclamar
            ante la Agencia Española de Protección de Datos (AEPD).
          </p>

          <h2>Analítica</h2>
          <p>
            Las visitas se cuentan con Vercel Web Analytics, que da métricas agregadas sin cookies
            y sin datos personales. No hay más medición: tu email solo se usa para enviarte la
            newsletter y no se comparte con Meta ni con ninguna plataforma publicitaria.
          </p>
        </Prose>
      </div>
    </Container>
  );
}
