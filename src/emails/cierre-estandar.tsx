import { Hr, Link, Text } from "@react-email/components";
import { emailColors as c } from "@/lib/email-colors";
import { CIERRE_SALIDAS } from "@/config/cierre";

/**
 * The same three exits as the article footer, in email.
 *
 * Reads the copy from src/config/cierre.ts but shares no markup with the web
 * component: one is Tailwind, the other has to survive Outlook. Sharing strings
 * keeps them consistent; sharing JSX between those two targets does not work.
 *
 * Relative hrefs are absolutised here — a `/empieza-aqui` in an email is a dead
 * link, and that is the sort of thing nobody notices until a subscriber says so.
 */
export function CierreEstandarEmail({ siteUrl }: { siteUrl: string }) {
  return (
    <>
      <Hr style={{ borderColor: c.border, margin: "28px 0 16px" }} />
      <Text
        style={{
          color: c.textMuted,
          fontSize: "11px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          margin: "0 0 12px",
        }}
      >
        Por dónde seguir
      </Text>
      {CIERRE_SALIDAS.map((salida) => (
        <Text
          key={salida.id}
          style={{ fontSize: "14px", lineHeight: "1.6", margin: "0 0 10px" }}
        >
          <Link
            href={
              salida.href.startsWith("/") ? `${siteUrl}${salida.href}` : salida.href
            }
            style={{ color: c.accent, fontWeight: 600 }}
          >
            {salida.titulo}
          </Link>
          <br />
          <span style={{ color: c.textMuted, fontSize: "13px" }}>
            {salida.descripcion}
          </span>
        </Text>
      ))}
    </>
  );
}
