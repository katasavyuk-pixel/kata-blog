import { Body, Column, Container, Head, Html, Img, Link, Preview, Row, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { CSS_MODO_OSCURO, LOGO_CORREO, emailColors as c, emailFonts as f } from "@/lib/email-colors";

/**
 * The frame every email shares since 26-nov-2026: ianexora.com's look. NBI's
 * logo on a white header, the name of what you are reading and its date, the
 * letter, and ianexora.com's navy footer with whatever that email must carry
 * (the unsubscribe link, or why you got it).
 *
 * Email-safe on purpose: tables (React Email's Row/Column), inline styles,
 * system fallbacks for Instrument Sans, one hosted PNG with its alt text (the
 * masthead still reads with images blocked, because the name is text too),
 * and a dark-mode stylesheet for the clients that honour it
 * (src/lib/email-colors.ts). Rounded corners and the pill button are NBI's;
 * classic Outlook squares them, which is fine.
 */
export function MarcoNbi({
  preview,
  rotulo,
  cabecera,
  ancho = 600,
  pie,
  children,
}: {
  preview: string;
  /** Top right, the name of what this is: «Newsletter de NBI». */
  rotulo: string;
  /** Under it: the date, or the week. */
  cabecera?: string;
  ancho?: number;
  /** Inside the navy footer, above NBI's line. */
  pie?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Html lang="es">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{CSS_MODO_OSCURO}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body className="nbi-fondo" style={{ backgroundColor: c.bg, margin: 0, padding: "32px 12px", fontFamily: f.sans, color: c.textMain }}>
        <Container
          className="nbi-carta"
          style={{
            maxWidth: `${ancho}px`,
            margin: "0 auto",
            backgroundColor: c.card,
            border: `1px solid ${c.border}`,
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          <Section className="nbi-cabecera" style={{ backgroundColor: c.card }}>
            <Row>
              <Column className="nbi-linea" style={{ padding: "20px 0 18px 28px", borderBottom: `1px solid ${c.border}`, verticalAlign: "middle" }}>
                <Link href="https://ianexora.com/">
                  <Img
                    src={LOGO_CORREO.src}
                    alt={LOGO_CORREO.alt}
                    width={String(LOGO_CORREO.ancho)}
                    height={String(LOGO_CORREO.alto)}
                    style={{ display: "block", border: 0, width: `${LOGO_CORREO.ancho}px`, height: `${LOGO_CORREO.alto}px` }}
                  />
                </Link>
              </Column>
              <Column
                align="right"
                className="nbi-linea"
                style={{ padding: "20px 28px 18px 0", borderBottom: `1px solid ${c.border}`, verticalAlign: "middle" }}
              >
                <Text
                  style={{
                    margin: 0,
                    fontFamily: f.sans,
                    fontSize: "11px",
                    lineHeight: "1.4",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: c.accent,
                  }}
                >
                  {rotulo}
                </Text>
                {cabecera ? (
                  <Text className="nbi-tenue" style={{ margin: "4px 0 0", fontFamily: f.sans, fontSize: "12px", lineHeight: "1.4", color: c.textMuted }}>
                    {cabecera}
                  </Text>
                ) : null}
              </Column>
            </Row>
          </Section>

          {children}

          <Section style={{ backgroundColor: c.footerBg, marginTop: "32px" }}>
            <Row>
              <Column style={{ padding: "22px 28px 24px" }}>
                {pie}
                <Text style={{ margin: pie ? "14px 0 0" : 0, fontFamily: f.sans, fontSize: "12px", lineHeight: "1.6", color: c.onFooter }}>
                  NBI · Nexora Business Intelligence ·{" "}
                  <Link href="https://ianexora.com/" style={{ color: c.onFooterLink, textDecoration: "underline" }}>
                    ianexora.com
                  </Link>
                </Text>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Text inside the navy footer. */
export function TextoDePie({ children }: { children: ReactNode }) {
  return <Text style={{ margin: 0, fontFamily: f.sans, fontSize: "12px", lineHeight: "1.6", color: c.onFooter }}>{children}</Text>;
}

/** A link inside the navy footer. */
export function EnlaceDePie({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ color: c.onFooterLink, textDecoration: "underline" }}>
      {children}
    </Link>
  );
}

/** NBI's button: the navy pill of «Pedir la llamada». The class turns it cyan in dark mode. */
export const estiloBoton = {
  display: "inline-block",
  backgroundColor: c.buttonBg,
  color: c.onAccent,
  fontFamily: f.sans,
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "13px 24px",
  borderRadius: "999px",
} as const;
