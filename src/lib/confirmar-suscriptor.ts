import type { SupabaseClient } from "@supabase/supabase-js";
import { generateToken, hashToken } from "@/lib/tokens";
import { urlPublica } from "@/lib/url-publica";
import { URL_CONFIRMADO, esListaPersonal, programaSecuenciaNbi } from "@/lib/listas";

/**
 * Shared confirm step for `/api/confirm`.
 *
 * The token is per row, so unsubscribing one list does not touch the other.
 * Personal lists are confirmed and sent back to kataivanovych.com. They do
 * not get the NBI cookie (that cookie opens NBI downloads) and they do not
 * get `scheduled_emails`.
 */

export type ProgramarSecuencia = (sub: {
  id: string;
  email: string;
  unsubscribeToken: string;
  resource?: string;
}) => Promise<void>;

export type ResultadoConfirmacion = {
  location: string;
  /** Set only for an NBI confirm. The route writes the `nbi_subscriber` cookie. */
  cookieEmail: string | null;
};

type FilaConfirmacion = {
  id: string;
  email: string;
  status: string;
  confirm_expires_at: string | null;
  list?: string | null;
};

async function leerPorToken(
  cliente: SupabaseClient,
  hash: string,
): Promise<{ fila: FilaConfirmacion | null; error: boolean }> {
  const conLista = await cliente
    .from("subscribers")
    .select("id, email, status, confirm_expires_at, list")
    .eq("confirm_token_hash", hash)
    .maybeSingle();

  if (!conLista.error) {
    return { fila: (conLista.data as FilaConfirmacion | null) ?? null, error: false };
  }

  // Migration 0006 not applied yet: `list` is not a column. Every live row is NBI.
  const sinLista = await cliente
    .from("subscribers")
    .select("id, email, status, confirm_expires_at")
    .eq("confirm_token_hash", hash)
    .maybeSingle();

  if (sinLista.error) return { fila: null, error: true };
  return { fila: (sinLista.data as FilaConfirmacion | null) ?? null, error: false };
}

export async function confirmarPorToken(
  cliente: SupabaseClient,
  input: {
    token: string;
    resource?: string;
    ahora?: Date;
    tokenBaja?: () => string;
    programarSecuencia: ProgramarSecuencia;
  },
): Promise<ResultadoConfirmacion> {
  const ahora = input.ahora ?? new Date();
  const { fila, error } = await leerPorToken(cliente, hashToken(input.token));

  if (error) {
    console.error("[confirm] read failed");
    return { location: urlPublica("/gracias?error=guardado").href, cookieEmail: null };
  }

  if (
    !fila ||
    fila.status === "unsubscribed" ||
    !fila.confirm_expires_at ||
    new Date(fila.confirm_expires_at).getTime() <= ahora.getTime()
  ) {
    return { location: urlPublica("/gracias?error=expired").href, cookieEmail: null };
  }

  const unsubscribeToken = (input.tokenBaja ?? generateToken)();
  const { error: confirmError } = await cliente
    .from("subscribers")
    .update({
      status: "confirmed",
      confirmed_at: ahora.toISOString(),
      confirm_token_hash: null,
      confirm_expires_at: null,
      unsubscribe_token: unsubscribeToken,
    })
    .eq("id", fila.id);

  // The update carries the unsubscribe token. Continuing after a failed write
  // would send sequence mail whose List-Unsubscribe token is in nobody's
  // database. Same failure for a personal confirm: do not claim it worked.
  if (confirmError) {
    console.error("[confirm] update failed:", confirmError.message);
    return { location: urlPublica("/gracias?error=guardado").href, cookieEmail: null };
  }

  const lista = fila.list ?? null;
  if (programaSecuenciaNbi(lista)) {
    await input.programarSecuencia({
      id: fila.id,
      email: fila.email,
      unsubscribeToken,
      resource: input.resource,
    });
  }

  if (esListaPersonal(lista)) {
    return { location: URL_CONFIRMADO, cookieEmail: null };
  }

  const dest = input.resource
    ? `/gracias?descarga=${encodeURIComponent(input.resource)}`
    : "/gracias?confirmed=1";
  return { location: urlPublica(dest).href, cookieEmail: fila.email };
}
