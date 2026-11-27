import type { SupabaseClient } from "@supabase/supabase-js";
import { collectCursorPages } from "@/lib/cursor-pages";
import { NewsletterError } from "@/lib/newsletter-error";
import { LISTA_NBI } from "@/lib/listas";

/** Stay below Supabase's default REST row cap and page by the primary key. */
const PAGE_SIZE = 500;

export type DestinatarioNbi = {
  id: string;
  email: string;
  unsubscribe_token: string;
};

/**
 * Confirmed NBI subscribers as of `asOf`.
 *
 * This is the recipient set for `sendIssue`, including its dry run. Personal
 * (`kataivanovych`) and `club` rows are a different consent and must not be
 * counted or mailed. There is no fallback that drops the list filter: if the
 * column is missing, the send fails instead of going out to everyone.
 */
export async function destinatariosConfirmadosNbi(
  cliente: SupabaseClient,
  asOf: string,
): Promise<DestinatarioNbi[]> {
  const rows = await collectCursorPages(PAGE_SIZE, async (afterId) => {
    let query = cliente
      .from("subscribers")
      .select("id, email, unsubscribe_token")
      .eq("status", "confirmed")
      .eq("list", LISTA_NBI)
      .lte("confirmed_at", asOf)
      .not("unsubscribe_token", "is", null)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (afterId) query = query.gt("id", afterId);

    const { data, error } = await query;
    if (error) {
      throw new NewsletterError(`No se pudo leer la lista: ${error.message}`, 500);
    }
    return (data ?? []) as {
      id: string;
      email: string | null;
      unsubscribe_token: string | null;
    }[];
  });

  return rows.filter(
    (fila): fila is DestinatarioNbi =>
      typeof fila.email === "string" && typeof fila.unsubscribe_token === "string",
  );
}
