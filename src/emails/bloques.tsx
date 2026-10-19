import { Button, Column, Img, Link, Row, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors as c, emailFonts as f } from "@/lib/email-colors";
import { FORMATOS_DE_CORREO, SECUENCIA_EN_CORREO, estilarHtml } from "@/lib/correo";

/**
 * The blocks of the visual edition, for email: tables and inline styles, the
 * only layout every mail client agrees on. Their twins for the web archive are
 * in src/components/newsletter/bloques.tsx; the copy they share comes from the
 * edition itself (src/lib/edicion.ts), never typed twice.
 *
 * Every URL arrives absolute and every picture as the JPEG crop of its box
 * (src/lib/correo.ts): mail clients ignore `object-fit` and some cannot show WebP.
 */

const etiqueta = {
  margin: 0,
  fontFamily: f.sans,
  fontSize: "12px",
  lineHeight: "1.4",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: c.accent,
};
const texto = { margin: 0, fontFamily: f.sans, fontSize: "15px", lineHeight: "1.55", color: c.textSoft };
const pie = { margin: 0, fontFamily: f.sans, fontSize: "12px", lineHeight: "1.4", color: c.textMuted };

/** Vertical room above a block: padding on a cell, which Outlook respects and margins it does not. */
function Hueco({ alto, children }: { alto: number; children: ReactNode }) {
  return (
    <Row>
      <Column style={{ paddingTop: `${alto}px` }}>{children}</Column>
    </Row>
  );
}

/** Markdown compiled by Velite, with the email's type on every tag. */
export function Cuerpo({ html, alto = 22 }: { html: string; alto?: number }) {
  return (
    <Hueco alto={alto}>
      <div dangerouslySetInnerHTML={{ __html: estilarHtml(html) }} />
    </Hueco>
  );
}

/** A section under a red rule, labelled in small capitals. */
export function Bloque({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <Hueco alto={30}>
      <Section style={{ borderTop: `3px solid ${c.rule}` }}>
        <Row>
          <Column style={{ paddingTop: "12px" }}>
            <Text style={etiqueta}>{titulo}</Text>
            {children}
          </Column>
        </Row>
      </Section>
    </Hueco>
  );
}

export function EnUnMinuto({ puntos }: { puntos: readonly string[] }) {
  return (
    <Hueco alto={20}>
      <Section style={{ backgroundColor: c.surface }}>
        <Row>
          <Column style={{ padding: "18px 20px" }}>
            <Text style={{ ...etiqueta, color: c.textMain }}>En un minuto</Text>
            <ul style={{ margin: "10px 0 0", padding: "0 0 0 18px" }}>
              {puntos.map((punto) => (
                <li key={punto} style={{ margin: "0 0 6px", fontFamily: f.sans, fontSize: "15px", lineHeight: "1.55", color: c.textMain }}>
                  {punto}
                </li>
              ))}
            </ul>
          </Column>
        </Row>
      </Section>
    </Hueco>
  );
}

/** The sequence as a GIF. Its first frame is the whole diagram: classic Outlook shows only that one. */
export function Secuencia({ src, titulo, alt }: { src: string; titulo: string; alt: string }) {
  const { ancho, alto } = SECUENCIA_EN_CORREO;
  return (
    <Hueco alto={26}>
      <Text style={{ margin: "0 0 12px", fontFamily: f.sans, fontSize: "13px", lineHeight: "1.4", fontWeight: 700, color: c.textMain }}>
        {titulo}
      </Text>
      <Img src={src} alt={alt} width={String(ancho)} height={String(alto)} style={{ display: "block", border: 0 }} />
    </Hueco>
  );
}

export function Boton({ href, children, claro = false }: { href: string; children: ReactNode; claro?: boolean }) {
  return (
    <Button
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: claro ? c.card : c.buttonBg,
        color: claro ? c.textMain : c.onAccent,
        fontFamily: f.sans,
        fontSize: "15px",
        fontWeight: 700,
        textDecoration: "none",
        padding: "13px 20px",
      }}
    >
      {children}
    </Button>
  );
}

export function BotonDeEdicion({ href, texto: rotulo }: { href: string; texto: string }) {
  return (
    <Hueco alto={22}>
      <Boton href={href}>{rotulo}</Boton>
    </Hueco>
  );
}

export type ConstruidoEnCorreo = {
  titulo: string;
  href: string;
  frase: string;
  etiqueta: string;
  /** Absolute URL of the 336×224 crop; without one, an ink tile with the project. */
  imagen?: string;
  proyecto: string;
};

export function Construido({ items }: { items: readonly ConstruidoEnCorreo[] }) {
  const { ancho, alto } = FORMATOS_DE_CORREO.tarjeta;
  return (
    <Bloque titulo="Lo que he construido">
      {items.map((item) => (
        <Row key={item.href + item.titulo} style={{ marginTop: "14px" }}>
          <Column width={ancho} style={{ width: `${ancho}px`, verticalAlign: "top", paddingTop: "14px" }}>
            {item.imagen ? (
              <Link href={item.href}>
                <Img src={item.imagen} alt="" width={String(ancho)} height={String(alto)} style={{ display: "block", border: 0 }} />
              </Link>
            ) : (
              <Section style={{ backgroundColor: c.textMain, width: `${ancho}px` }}>
                <Row>
                  <Column style={{ height: `${alto}px`, padding: "10px 12px", verticalAlign: "bottom" }}>
                    <Text style={{ margin: 0, fontFamily: f.serif, fontSize: "15px", lineHeight: "1.2", color: c.card }}>
                      {item.proyecto}
                    </Text>
                  </Column>
                </Row>
              </Section>
            )}
          </Column>
          <Column style={{ verticalAlign: "top", padding: "14px 0 0 16px" }}>
            <Text style={pie}>{item.etiqueta}</Text>
            <Link href={item.href} style={{ display: "block", marginTop: "4px", fontFamily: f.serif, fontSize: "19px", lineHeight: "1.25", color: c.textMain, textDecoration: "none" }}>
              {item.titulo}
            </Link>
            <Text style={{ ...texto, marginTop: "6px", fontSize: "14px", lineHeight: "1.5" }}>{item.frase}</Text>
          </Column>
        </Row>
      ))}
    </Bloque>
  );
}

/**
 * «Lo importante de esta semana»: the card (picture, title, link) around the
 * editor's own text, which is the body's section of that name.
 */
export function LoImportante({
  titulo,
  html,
  href,
  rotulo,
  imagen,
}: {
  titulo?: string;
  /** The section's HTML, as Velite compiled it. */
  html?: string | null;
  href?: string;
  rotulo: string;
  /** Absolute URL of the 1072×440 crop. */
  imagen?: { src: string; alt: string };
}) {
  const { ancho, alto } = FORMATOS_DE_CORREO.ancha;
  return (
    <Bloque titulo="Lo importante de esta semana">
      {imagen ? (
        <Img src={imagen.src} alt={imagen.alt} width={String(ancho)} height={String(alto)} style={{ display: "block", marginTop: "14px", border: 0 }} />
      ) : null}
      {titulo ? (
        <Text style={{ margin: "14px 0 0", fontFamily: f.serif, fontSize: "21px", lineHeight: "1.25", color: c.textMain }}>{titulo}</Text>
      ) : null}
      {html ? <div style={{ marginTop: "12px" }} dangerouslySetInnerHTML={{ __html: estilarHtml(html) }} /> : null}
      {href ? (
        <Text style={{ ...pie, fontSize: "13px" }}>
          <Link href={href} style={{ color: c.accent, textDecoration: "underline" }}>
            {rotulo}
          </Link>
        </Text>
      ) : null}
    </Bloque>
  );
}

export function SkillParaUsar({
  titulo,
  texto: queHace,
  href,
  color,
  foto,
}: {
  titulo: string;
  texto: string;
  href: string;
  color: string;
  /** Absolute URL of the 400×500 crop. */
  foto?: string;
}) {
  const { ancho, alto } = FORMATOS_DE_CORREO.skill;
  return (
    <Bloque titulo="Para usar esta semana">
      <Hueco alto={14}>
        <Section style={{ backgroundColor: color }}>
          <Row>
            {foto ? (
              <Column width={ancho} style={{ width: `${ancho}px`, verticalAlign: "top" }}>
                <Img src={foto} alt="" width={String(ancho)} height={String(alto)} style={{ display: "block", border: 0 }} />
              </Column>
            ) : null}
            <Column style={{ padding: "20px 22px", verticalAlign: "top" }}>
              <Text style={{ ...etiqueta, color: c.onAccent }}>Skill</Text>
              <Text style={{ margin: "8px 0 0", fontFamily: f.serif, fontSize: "24px", lineHeight: "1.15", color: c.onAccent }}>{titulo}</Text>
              <Text style={{ ...texto, margin: "10px 0 18px", color: c.onAccent }}>{queHace}</Text>
              <Boton href={href} claro>
                Instalarla en tu agente
              </Boton>
            </Column>
          </Row>
        </Section>
      </Hueco>
    </Bloque>
  );
}

/** The one question, and the signature: it is a person who reads the answers. */
export function Pregunta({ texto: pregunta }: { texto: string }) {
  return (
    <Hueco alto={30}>
      <Section style={{ borderTop: `1px solid ${c.border}` }}>
        <Row>
          <Column style={{ paddingTop: "18px" }}>
            <Text style={{ margin: 0, fontFamily: f.sans, fontSize: "16px", lineHeight: "1.6", color: c.textMain }}>
              <strong>Una cosa que te pido:</strong> {pregunta}
            </Text>
            <Text style={{ margin: "14px 0 0", fontFamily: f.sans, fontSize: "16px", lineHeight: "1.6", color: c.textMain }}>
              Lo leo yo.
              <br />
              Kata
            </Text>
          </Column>
        </Row>
      </Section>
    </Hueco>
  );
}
