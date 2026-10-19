import { redirect } from "next/navigation";

/**
 * La serie se renombró de "Radar IA" a "Noticias" y mudó a /noticias.
 *
 * Mantener este archivo (en vez de borrar la carpeta) conserva cualquier enlace
 * externo apuntando a /radar; el 308 de next.config.ts es el que da la pista
 * canónica a los crawlers, este redirect defiende la ruta en tiempo de ejecución.
 */
export default function RadarRedirect() {
  redirect("/noticias");
}
