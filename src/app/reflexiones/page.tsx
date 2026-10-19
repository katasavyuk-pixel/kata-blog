import type { Metadata } from "next";
import { EstantePagina } from "@/components/content/estante-pagina";
import { ESTANTES } from "@/config/taxonomy";
import { feedAlternates, withOpenGraph } from "@/config/site";

export const metadata: Metadata = withOpenGraph("/reflexiones", {
  title: ESTANTES.reflexiones,
  description:
    "Lo que pienso mientras construyo mi negocio con IA: decisiones, dudas y lecturas de lo que pasa, firmadas y escritas a mano.",
  alternates: { ...feedAlternates, canonical: "/reflexiones" },
});

/**
 * The reflections: the author's own reading of something. This is the shelf
 * nothing automated can fill, which is what makes it the signed half of the
 * site next to the news.
 */
export default function ReflexionesPage() {
  return <EstantePagina estante="reflexiones" kicker="firmadas y escritas a mano" unidad={["reflexión", "reflexiones"]} />;
}
