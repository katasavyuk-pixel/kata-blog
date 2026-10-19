/**
 * How many emails of one batch Resend accepted.
 *
 * `resend.batch.send()` (resend 6.x) answers `{ data: { data: [{ id }] }, error }`:
 * the accepted emails are one level down, in `data.data`. Until 2026-10-15
 * the newsletter read `data.length`, which is undefined on that object, so the
 * first real broadcast counted 0 accepted and 5 failed while Resend had taken
 * all five without an error. Pure so tests/resend-lote.test.ts can pin the
 * shape without loading the email templates.
 */
export type RespuestaLote = {
  data: { data?: { id: string }[] | null } | null;
  error: unknown;
};

export function aceptadosDelLote(respuesta: RespuestaLote, enLote: number): number {
  const ids = respuesta.data?.data;
  return Math.min(Array.isArray(ids) ? ids.length : 0, enLote);
}
