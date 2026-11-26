import { Button, Column, Heading, Link, Row, Section, Text } from "@react-email/components";
import { emailColors as c, emailFonts as f } from "@/lib/email-colors";
import { siteConfig } from "@/config/site";
import { REGALO } from "@/config/regalo";
import { EnlaceDePie, MarcoNbi, TextoDePie, estiloBoton } from "@/emails/marco";

// React Email renders to inline-styled HTML (no access to CSS tokens).
// Palette and fonts: src/lib/email-colors.ts (ianexora.com's since 26-nov-2026).
// The frame (NBI logo, navy footer, dark mode) is src/emails/marco.tsx. The
// logo is the one picture and carries its alt text; the name of the
// newsletter is text, so the masthead still reads with images blocked.
const parrafo = { margin: "0 0 12px", fontFamily: f.sans, fontSize: "16px", lineHeight: "1.6", color: c.textMain };
const tenue = { margin: "0 0 12px", fontFamily: f.sans, fontSize: "13px", lineHeight: "1.6", color: c.textMuted };

export function ConfirmOptInEmail({
  confirmUrl,
  brand,
}: {
  confirmUrl: string;
  brand: string;
}) {
  return (
    <MarcoNbi
      preview={`Un clic y te llega tu regalo: «${REGALO.titulo}».`}
      rotulo={brand}
      cabecera={siteConfig.domain}
      ancho={560}
      pie={
        <TextoDePie>
          Te llega porque alguien pidió suscribirse con esta dirección en{" "}
          <EnlaceDePie href={siteConfig.url}>{siteConfig.domain}</EnlaceDePie>. Sin tu clic no recibirás nada más.
        </TextoDePie>
      }
    >
      <Row>
        <Column style={{ padding: "28px 28px 0" }}>
          <Heading
            as="h1"
            style={{ margin: "0 0 14px", fontFamily: f.display, fontSize: "24px", lineHeight: "1.25", fontWeight: 600, letterSpacing: "-0.01em", color: c.textMain }}
          >
            Confirma tu suscripción
          </Heading>
          <Text style={parrafo}>
            Has solicitado suscribirte a la <strong>{brand}</strong> desde{" "}
            {siteConfig.domain}. Antes de enviarte nada, necesito comprobar que esta
            dirección de correo es tuya.
          </Text>
          <Text style={parrafo}>
            Pulsa el botón para confirmar tu email y completar el alta. Es el único
            paso que te pido.
          </Text>
          <Text style={parrafo}>
            Al confirmar te llega tu regalo: <strong>«{REGALO.titulo}»</strong>.
          </Text>

          <Section style={{ margin: "24px 0" }}>
            <Button href={confirmUrl} className="nbi-boton" style={estiloBoton}>
              Confirmar suscripción
            </Button>
          </Section>

          <Text className="nbi-tenue" style={tenue}>
            El enlace caduca en 24 horas. Si no funciona, copia y pega esta dirección
            en tu navegador:{" "}
            <Link href={confirmUrl} style={{ color: c.accent, wordBreak: "break-all" }}>
              {confirmUrl}
            </Link>
          </Text>
          <Text className="nbi-tenue" style={tenue}>
            <strong>¿No has sido tú?</strong> Ignora este email: sin esa confirmación
            no quedarás suscrito y tu dirección no recibirá ningún envío.
          </Text>
        </Column>
      </Row>
    </MarcoNbi>
  );
}

/**
 * Plain-text alternative for the same message.
 *
 * Every other email in the system derives its text part from the rendered HTML,
 * so the two cannot drift. This one is written out because it has no
 * personalised blocks to derive — and because it lives in the same file as the
 * JSX, three inches away, so a change to one that forgets the other is visible
 * in the diff.
 *
 * It matters more here than anywhere else: an HTML-only email is a bulk-mail
 * signal, this was landing in spam, and it is the one message the entire funnel
 * depends on. A client that blocks HTML was being shown a blank page with no
 * way to complete the opt-in.
 */
export function confirmOptInText(confirmUrl: string, brand: string): string {
  return [
    `Confirma tu suscripción a la ${brand}`,
    "",
    `Has solicitado suscribirte a la ${brand} desde ${siteConfig.domain}.`,
    "Antes de enviarte nada, necesito comprobar que esta dirección de correo es tuya.",
    "",
    "Abre esta dirección para confirmar tu email y completar el alta:",
    confirmUrl,
    "",
    `Al confirmar te llega tu regalo: «${REGALO.titulo}».`,
    "",
    "El enlace caduca en 24 horas.",
    "",
    "¿No has sido tú? Ignora este email: sin esa confirmación no quedarás",
    "suscrito y tu dirección no recibirá ningún envío.",
    "",
    `${brand} · ${siteConfig.url}`,
  ].join("\n");
}

export default ConfirmOptInEmail;
