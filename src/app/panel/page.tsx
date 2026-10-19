import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { NewsletterSendPanel } from "@/components/panel/newsletter-send";
import { NewsletterPrueba } from "@/components/panel/newsletter-prueba";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getFunnel, type CountRow } from "@/lib/funnel";
import { newsletters } from "#site/content";
import {
  PANEL_COOKIE,
  isPanelConfigured,
  verifySession,
} from "@/lib/panel-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Not in sitemap.ts either. Both matter: noindex keeps it out of results, and a
// route absent from the sitemap is not advertised in the first place.
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

function Tabla({
  titulo,
  nota,
  rows,
  cabecera,
}: {
  titulo: string;
  nota?: string;
  rows: (string | number)[][];
  cabecera: string[];
}) {
  return (
    <section className="mt-10">
      <h2 className="text-h2">{titulo}</h2>
      {nota ? <p className="mt-1 text-sm text-muted">{nota}</p> : null}
      {rows.length === 0 ? (
        <p className="mt-3 font-mono text-sm text-faint">Sin datos todavía.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {cabecera.map((h) => (
                  <th
                    key={h}
                    className="py-2 pr-4 font-sans text-[0.8125rem] font-semibold text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/60">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`py-2 pr-4 ${j === 0 ? "text-fg" : "font-mono tabular-nums text-muted"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Login({ error }: { error: boolean }) {
  return (
    <Container className="py-24">
      <form
        action="/api/panel/login"
        method="POST"
        className="mx-auto max-w-sm"
      >
        <h1 className="text-h1">Panel</h1>
        <label htmlFor="password" className="mt-6 block text-sm text-muted">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 h-11 w-full border border-border bg-bg px-4 text-sm text-fg"
        />
        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            No es correcta.
          </p>
        ) : null}
        <div className="mt-4">
          <Button type="submit">Entrar</Button>
        </div>
      </form>
    </Container>
  );
}

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const rowsOf = (rows: CountRow[]) => rows.map((r) => [r.label, r.count]);

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  if (!isPanelConfigured()) {
    return (
      <Container className="py-24">
        <p className="text-muted">
          El panel está desactivado: falta <code>ADMIN_PANEL_SECRET</code>.
        </p>
      </Container>
    );
  }

  const session = (await cookies()).get(PANEL_COOKIE)?.value;
  if (!verifySession(session)) return <Login error={Boolean(sp.error)} />;

  if (!isSupabaseConfigured()) {
    return (
      <Container className="py-24">
        <p className="text-muted">Supabase no está configurado.</p>
      </Container>
    );
  }

  const supabase = createAdminClient();
  const f = await getFunnel(supabase);
  const candidateIssues = newsletters
    .filter((issue) => !issue.draft && !issue.sent)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const claimResult = candidateIssues.length
    ? await supabase
        .from("newsletter_issues")
        .select("issue_id")
        .in("issue_id", candidateIssues.map((issue) => issue.issue))
    : { data: [], error: null };
  const claimLookupFailed = Boolean(claimResult.error);
  const claimedIssueIds = new Set(claimResult.data?.map((row) => row.issue_id) ?? []);
  const pendingIssues = (claimLookupFailed
    ? []
    : candidateIssues.filter((issue) => !claimedIssueIds.has(issue.issue))
  )
    .map((issue) => ({
      issue: issue.issue,
      subject: issue.subject,
      title: issue.title,
      date: issue.date,
    }));

  // Every edition, newest first: a test copy is safe for any of them.
  const todasLasEdiciones = [...newsletters]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .map((issue) => ({
      issue: issue.issue,
      title: issue.title,
      date: issue.date.slice(0, 10),
      estado: issue.sent ? "enviada" : issue.draft ? "borrador" : "aprobada",
    }));

  return (
    <Container className="py-16">
      <h1 className="text-h1">Embudo</h1>
      <p className="mt-2 text-sm text-muted">
        Números, sin gráficas. {f.total} suscriptores en la lista.
        {f.truncated
          ? " Aviso: se ha alcanzado el tope de filas; toca mover la agregación a SQL."
          : ""}
      </p>

      <Tabla
        titulo="Estado de la lista"
        nota={`Tasa de confirmación: ${pct(f.tasaConfirmacion)} — quien se da de baja confirmó antes, así que cuenta como confirmado.`}
        cabecera={["estado", "personas"]}
        rows={[
          ["pending", f.porEstado.pending],
          ["confirmed", f.porEstado.confirmed],
          ["unsubscribed", f.porEstado.unsubscribed],
          ["bajas últimos 30 días", f.bajas30d],
        ]}
      />

      <Tabla
        titulo="Altas por semana"
        nota="Últimas 12 semanas. Las semanas vacías se muestran a propósito: un hueco en la cadencia es información."
        cabecera={["semana (lunes)", "altas", "confirmadas"]}
        rows={f.semanas.map((w) => [w.week, w.altas, w.confirmadas])}
      />

      <Tabla
        titulo="Por página de alta"
        nota="signup_path: la ruta literal donde ocurrió el alta. Responde qué artículo capta."
        cabecera={["ruta", "altas"]}
        rows={rowsOf(f.porSignupPath)}
      />

      <Tabla
        titulo="Por origen"
        nota="source: el cubo semántico (footer, post-inline, lead_magnet:…, con sufijo :utm_source cuando lo hay)."
        cabecera={["origen", "altas"]}
        rows={rowsOf(f.porSource)}
      />

      <Tabla
        titulo="Calculadora de costes"
        nota="«Desgloses pedidos» son envíos solicitados, NO usos. Usar la calculadora no toca el servidor — el uso está en Vercel Web Analytics, evento calculadora_usada."
        cabecera={["métrica", "valor"]}
        rows={[
          ["desgloses pedidos", f.calculadora.desglosesPedidos],
          ["direcciones distintas", f.calculadora.direcciones],
          ["de esas, confirmadas", f.calculadora.confirmadas],
        ]}
      />

      <Tabla
        titulo="Secuencia de bienvenida"
        nota="Aperturas no aparecen: requieren un webhook de Resend que no existe, y el open rate no sirve para decidir (Apple Mail precarga los píxeles)."
        cabecera={["paso", "enviados", "pendientes"]}
        rows={f.secuencia.map((s) => [s.key, s.enviados, s.pendientes])}
      />

      <section aria-labelledby="newsletter-send-title" className="mt-12 border-t border-border pt-8">
        <h2 id="newsletter-send-title" className="text-h2">Envío de newsletter</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          El ensayo solo consulta el recuento. El envío real requiere revisar esa cifra y confirmarlo aparte.
        </p>
        {claimLookupFailed ? (
          <p role="alert" className="mt-3 max-w-2xl text-sm text-danger">
            No se pudo comprobar el historial de envíos. La acción queda oculta para evitar duplicados.
          </p>
        ) : claimedIssueIds.size > 0 ? (
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {claimedIssueIds.size} edición(es) con un intento registrado no aparecen como pendientes. Si hubo un envío parcial, requiere recuperación técnica antes de cualquier reintento.
          </p>
        ) : null}
        <NewsletterSendPanel issues={pendingIssues} />
      </section>

      <section aria-labelledby="newsletter-prueba-title" className="mt-12 border-t border-border pt-8">
        <h2 id="newsletter-prueba-title" className="text-h2">Prueba en tu buzón</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Una copia de cualquier edición, también de un borrador, a la dirección de respuesta y con «[PRUEBA]» en el
          asunto. No toca la lista ni marca nada como enviado.
        </p>
        <NewsletterPrueba ediciones={todasLasEdiciones} />
      </section>
    </Container>
  );
}
