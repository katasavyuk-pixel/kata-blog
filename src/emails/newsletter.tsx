import { Column, Heading, Img, Row } from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors as c, emailFonts as f } from "@/lib/email-colors";
import { CierreEstandarEmail } from "@/emails/cierre-estandar";
import { EnlaceDePie, MarcoNbi, TextoDePie } from "@/emails/marco";

/**
 * Base layout for every email to the list: the welcome sequence, the kit
 * delivery and the editions. Since 26-nov-2026 it is ianexora.com's look
 * (src/emails/marco.tsx): NBI's logo, «Newsletter de NBI» and the date, the
 * letter, the navy footer with the unsubscribe link.
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
    <MarcoNbi
      preview={preview}
      rotulo={brand}
      cabecera={cabecera}
      pie={
        <TextoDePie>
          Recibes este correo porque te suscribiste a la {brand}.{" "}
          <EnlaceDePie href={unsubscribeUrl}>Cancelar suscripción</EnlaceDePie>.
        </TextoDePie>
      }
    >
      {imagen ? (
        <Img src={imagen.src} alt={imagen.alt} width="600" height="280" style={{ display: "block", width: "100%", height: "auto", border: 0 }} />
      ) : null}
      <Row>
        <Column style={{ padding: "28px 28px 0" }}>
          <Heading
            as="h1"
            style={{ margin: 0, fontFamily: f.display, fontSize: "28px", lineHeight: "1.2", fontWeight: 600, letterSpacing: "-0.01em", color: c.textMain }}
          >
            {title}
          </Heading>
        </Column>
      </Row>
      <Row>
        <Column style={{ padding: "16px 28px 0" }}>
          {children}
          {showClosing && siteUrl ? <CierreEstandarEmail siteUrl={siteUrl} /> : null}
        </Column>
      </Row>
    </MarcoNbi>
  );
}

export default NewsletterEmail;
