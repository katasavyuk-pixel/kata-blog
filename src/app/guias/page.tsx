import type { Metadata } from "next";
import { EstantePagina } from "@/components/content/estante-pagina";
import { ESTANTES } from "@/config/taxonomy";
import { feedAlternates, withOpenGraph } from "@/config/site";

export const metadata: Metadata = withOpenGraph("/guias", {
  title: ESTANTES.guias,
  description:
    "Guías sobre IA aplicada a un negocio: cuánto cuesta, cómo se instala y cuál elegir, respondido con lo que he montado y con la fuente de cada dato.",
  alternates: { ...feedAlternates, canonical: "/guias" },
});

/**
 * The guides: pieces that answer a question people actually search for. What a
 * guide must carry to be one (a search title, a question heading, an FAQ, a
 * primary source) is enforced by tests/guias.test.ts, not by this page.
 */
export default function GuiasPage() {
  return <EstantePagina estante="guias" kicker="con su fuente" unidad={["guía", "guías"]} />;
}
