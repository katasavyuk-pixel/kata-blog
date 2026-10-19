import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { emailColors as c } from "@/lib/email-colors";
import { siteConfig } from "@/config/site";
import { REGALO } from "@/config/regalo";

// React Email renders to inline-styled HTML (no access to CSS tokens).
// Palette lives in src/lib/email-colors.ts — keep in sync with globals.css.
// Text-only masthead on purpose: no external logos or images, so the email
// renders identically with images blocked (most clients block them by default).
const main = { backgroundColor: c.bg, fontFamily: "Arial, Helvetica, sans-serif", color: c.textMain };
const container = { maxWidth: "480px", margin: "0 auto", padding: "32px", backgroundColor: c.card, borderTop: `4px solid ${c.rule}` };
const masthead = { color: c.accent, fontSize: "13px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, margin: 0 };
const mastheadDomain = { color: c.textMuted, fontSize: "12px", letterSpacing: "1px", margin: "4px 0 0" };
const button = { backgroundColor: c.buttonBg, color: c.onAccent, padding: "13px 20px", fontWeight: 700, textDecoration: "none", display: "inline-block" };
const muted = { color: c.textMuted, fontSize: "13px", lineHeight: "1.6" };
const footer = { color: c.textMuted, fontSize: "12px", lineHeight: "1.6", margin: 0 };

export function ConfirmOptInEmail({
  confirmUrl,
  brand,
}: {
  confirmUrl: string;
  brand: string;
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Un clic y te llega tu regalo: «{REGALO.titulo}».</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={masthead}>{brand}</Text>
          <Text style={mastheadDomain}>{siteConfig.domain}</Text>
          <Hr style={{ borderColor: c.border, margin: "16px 0 20px" }} />

          <Heading style={{ fontSize: "22px", margin: "0 0 12px" }}>
            Confirma tu suscripción
          </Heading>
          <Text style={{ lineHeight: "1.6", margin: "0 0 12px" }}>
            Has solicitado suscribirte a la newsletter de <strong>{brand}</strong> desde{" "}
            {siteConfig.domain}. Antes de enviarte nada, necesito comprobar que esta
            dirección de correo es tuya.
          </Text>
          <Text style={{ lineHeight: "1.6", margin: "0 0 4px" }}>
            Pulsa el botón para confirmar tu email y completar el alta. Es el único
            paso que te pido.
          </Text>
          <Text style={{ lineHeight: "1.6", margin: "12px 0 4px" }}>
            Al confirmar te llega tu regalo: <strong>«{REGALO.titulo}»</strong>.
          </Text>

          <Section style={{ margin: "24px 0" }}>
            <Button href={confirmUrl} style={button}>
              Confirmar suscripción
            </Button>
          </Section>

          <Text style={muted}>
            El enlace caduca en 24 horas. Si no funciona, copia y pega esta dirección
            en tu navegador:{" "}
            <Link href={confirmUrl} style={{ color: c.accent, wordBreak: "break-all" }}>
              {confirmUrl}
            </Link>
          </Text>
          <Text style={muted}>
            <strong>¿No has sido tú?</strong> Ignora este email: sin esa confirmación
            no quedarás suscrito y tu dirección no recibirá ningún envío.
          </Text>

          <Hr style={{ borderColor: c.border, margin: "28px 0 16px" }} />
          <Text style={footer}>
            {brand} ·{" "}
            <Link href={siteConfig.url} style={{ color: c.accent }}>
              {siteConfig.domain}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
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
    `Confirma tu suscripción a ${brand}`,
    "",
    `Has solicitado suscribirte a la newsletter de ${brand} desde ${siteConfig.domain}.`,
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
