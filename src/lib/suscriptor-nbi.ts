import type { SupabaseClient } from "@supabase/supabase-js";
import { LISTA_NBI } from "@/lib/listas";

/**
 * One email can sit on more than one list after migration 0006.
 * `.eq("email").maybeSingle()` then errors in PostgREST, and a gift or a
 * panel lookup would either fail or read the personal row. NBI reads `nbi`.
 *
 * The list column (and `signup_path`, from 0005) may be missing until Kata
 * applies that migration alone. A failed filtered read falls back to the
 * pre-0006 shape so the live signup keeps working. A send never uses this
 * fallback: mailing everyone because the column is missing is worse.
 */

export type FilaNbi = {
  id: string;
  status: string;
  unsubscribe_token: string | null;
};

const COLUMNAS = "id, status, unsubscribe_token";

export async function buscarSuscriptorNbi(
  cliente: SupabaseClient,
  email: string,
): Promise<FilaNbi | null> {
  const conLista = await cliente
    .from("subscribers")
    .select(COLUMNAS)
    .eq("email", email)
    .eq("list", LISTA_NBI)
    .maybeSingle();

  if (!conLista.error) return (conLista.data as FilaNbi | null) ?? null;

  const sinLista = await cliente
    .from("subscribers")
    .select(COLUMNAS)
    .eq("email", email)
    .maybeSingle();

  if (sinLista.error) return null;
  return (sinLista.data as FilaNbi | null) ?? null;
}

type FilaPendienteNbi = {
  email: string;
  status: "pending";
  confirm_token_hash: string;
  confirm_expires_at: string;
  consent_ip: string | null;
  consent_at: string;
  source: string;
  locale: string;
  signup_path: string | null;
};

/**
 * Upsert onto `list = nbi`, conflict key `(email, list)`.
 *
 * Deploys and migrations are not atomic here. The first write is the one that
 * is correct once 0006 is applied. The later ones exist so a deploy that
 * lands before that file — or before 0005's `signup_path` — still stores the
 * opt-in instead of answering the form with a storage error. None of the
 * fallbacks insert without a conflict target, so a failed first write cannot
 * create a second row.
 */
export async function guardarPendienteNbi(
  cliente: SupabaseClient,
  fila: FilaPendienteNbi,
): Promise<{ error: { message: string } | null }> {
  const base = {
    email: fila.email,
    status: fila.status,
    confirm_token_hash: fila.confirm_token_hash,
    confirm_expires_at: fila.confirm_expires_at,
    consent_ip: fila.consent_ip,
    source: fila.source,
    locale: fila.locale,
  };
  const conLista = {
    ...base,
    list: LISTA_NBI,
    consent_at: fila.consent_at,
    signup_path: fila.signup_path,
  };

  let { error } = await cliente
    .from("subscribers")
    .upsert(conLista, { onConflict: "email,list" });

  if (error) {
    ({ error } = await cliente.from("subscribers").upsert(
      { ...base, list: LISTA_NBI, consent_at: fila.consent_at },
      { onConflict: "email,list" },
    ));
  }

  if (error) {
    ({ error } = await cliente
      .from("subscribers")
      .upsert({ ...base, signup_path: fila.signup_path }, { onConflict: "email" }));
  }

  if (error) {
    ({ error } = await cliente.from("subscribers").upsert(base, { onConflict: "email" }));
  }

  return { error: error ? { message: error.message } : null };
}
