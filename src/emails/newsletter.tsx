import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors as c, emailFonts as f } from "@/lib/email-colors";
import { CierreEstandarEmail } from "@/emails/cierre-estandar";

const main = { backgroundColor: c.bg, margin: 0, padding: "32px 0", fontFamily: f.sans, color: c.textMain };
const container = { maxWidth: "600px", margin: "0 auto", backgroundColor: c.card, borderTop: `4px solid ${c.rule}` };

/**
 * Base layout for every email to the list: the welcome sequence and the
 * editions. A white letter on the site's paper, a red rule on top, the name
 * and the date, square corners (2026-10-15, the short visual newsletter).
 * `unsubscribeUrl` is required so every broadcast carries a working one-click
 * unsubscribe (RFC 8058 + visible link).
 *
 * `imagen` goes under the header edge to edge; `children` sit inside the
 * margins. `showClosing` adds the standard three exits. Off by default because
 * the onboarding sequence must not have it: its third email *is* the offer.
 * Old-style broadcasts turn it on; the visual editions end on their question.
 */
export function NewsletterEmail({
  brand,
  preview,
  title,
  unsubscribeUrl,
  siteUrl,
  cabecera,
  imagen,
  showClosing = false,
  children,
}: {
  brand: string;
  preview: string;
  title: string;
  unsubscribeUrl: string;
  siteUrl?: string;
  /** Right of the name: the date, or the week. */
  cabecera?: string;
  /** Absolute URL of a 1200×560 JPEG, shown at 600×280. */
  imagen?: { src: string; alt: string };
  showClosing?: boolean;
  children: ReactNode;
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Row>
            <Column style={{ padding: "22px 0 18px 32px", borderBottom: `1px solid ${c.border}` }}>
              <Text style={{ margin: 0, fontFamily: f.serif, fontSize: "19px", lineHeight: "1.3", fontWeight: 700, color: c.textMain }}>
                {brand}
              </Text>
            </Column>
            <Column align="right" style={{ padding: "22px 32px 18px 0", borderBottom: `1px solid ${c.border}` }}>
              {cabecera ? (
                <Text style={{ margin: 0, fontFamily: f.sans, fontSize: "12px", lineHeight: "1.3", color: c.textMuted }}>{cabecera}</Text>
              ) : null}
            </Column>
          </Row>
          {imagen ? (
            <Img src={imagen.src} alt={imagen.alt} width="600" height="280" style={{ display: "block", width: "100%", height: "auto", border: 0 }} />
          ) : null}
          <Row>
            <Column style={{ padding: "26px 32px 0" }}>
              <Heading
                as="h1"
                style={{ margin: 0, fontFamily: f.serif, fontSize: "28px", lineHeight: "1.18", fontWeight: 400, color: c.textMain }}
              >
                {title}
              </Heading>
            </Column>
          </Row>
          <Row>
            <Column style={{ padding: "0 32px" }}>
              {children}
              {showClosing && siteUrl ? <CierreEstandarEmail siteUrl={siteUrl} /> : null}
            </Column>
          </Row>
          <Row>
            <Column style={{ padding: "28px 0 0" }}>
              <Section style={{ backgroundColor: c.surface }}>
                <Row>
                  <Column style={{ padding: "16px 32px 20px" }}>
                    <Text style={{ margin: 0, fontFamily: f.sans, fontSize: "12px", lineHeight: "1.6", color: c.textMuted }}>
                      Recibes este correo porque te suscribiste a {brand}.{" "}
                      <Link href={unsubscribeUrl} style={{ color: c.accent, textDecoration: "underline" }}>
                        Cancelar suscripción
                      </Link>
                      .
                    </Text>
                  </Column>
                </Row>
              </Section>
            </Column>
          </Row>
        </Container>
      </Body>
    </Html>
  );
}

export default NewsletterEmail;
