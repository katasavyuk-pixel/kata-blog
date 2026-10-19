import { formatDateShort } from "@/lib/format";

/**
 * A daily edition is late once it is more than two days old — one day for the
 * run plus enough slack that a single missed run does not read as broken.
 */
const CADENCE_GRACE_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whether the site may still claim a daily cadence.
 *
 * La serie se renombró a "Noticias" y su pipeline ahora publica en automático
 * cada día (commit directo a main, sin PR humano). El rótulo "en automático"
 * era la mentira de la versión semanal: el workflow abría un PR que había que
 * mergear, y mientras tanto la home seguía anunciándolo. Ahora la claim se
 * deriva de la edición más reciente, así que un pipeline roto degrada el copy
 * en vez de convertir la página en una mentira.
 */
export function getRadarCadence(
  editionDate: string,
  now = new Date(),
): { onSchedule: boolean; label: string } {
  const ageDays = (now.getTime() - new Date(editionDate).getTime()) / MS_PER_DAY;
  return ageDays <= CADENCE_GRACE_DAYS
    ? { onSchedule: true, label: "Todos los días · en automático" }
    : { onSchedule: false, label: `Última edición: ${formatDateShort(editionDate)}` };
}
