/**
 * Central glossary for the <Term> hover/focus popover, and the source for
 * the indexable /glosario pages. Grows over time.
 */
export type GlossaryEntry = {
  title: string;
  def: string;
  /** Slug of the post that explains this term in depth, if one exists. */
  relatedSlug?: string;
  /** Last day the entry's text changed (YYYY-MM-DD): its `lastmod` in the sitemap. */
  updated: string;
  /** The term inside a sentence, with its article: «Qué es un token en IA». */
  enFrase: string;
};

export const glossary: Record<string, GlossaryEntry> = {
  token: {
    title: "Token",
    def: "La unidad mínima que procesa un modelo de lenguaje: trozos de palabra, no letras ni palabras enteras. El precio y el límite de contexto se miden en tokens.",
    relatedSlug: "que-es-un-token",
    updated: "2026-07-26",
    enFrase: "un token",
  },
  embedding: {
    title: "Embedding",
    def: "Representación de un texto como un vector de números. Textos con significado parecido quedan cerca en ese espacio: la base de la búsqueda semántica y de RAG.",
    updated: "2026-06-24",
    enFrase: "un embedding",
  },
  rag: {
    title: "RAG",
    def: "Retrieval-Augmented Generation: recuperar fragmentos relevantes de tus datos y dárselos al modelo como contexto antes de que responda, para reducir alucinaciones.",
    relatedSlug: "que-es-rag",
    updated: "2026-07-26",
    enFrase: "RAG",
  },
  prompt: {
    title: "Prompt",
    def: "Las instrucciones y el contexto que le das al modelo. Pequeños cambios en el prompt pueden cambiar mucho la respuesta.",
    updated: "2026-06-24",
    enFrase: "un prompt",
  },
  hallucination: {
    title: "Alucinación",
    def: "Cuando el modelo responde con algo plausible pero falso (datos, citas o fechas inventadas) con total seguridad. Fluido no es lo mismo que correcto.",
    relatedSlug: "cuando-la-ia-alucina",
    updated: "2026-07-26",
    enFrase: "una alucinación",
  },
  temperature: {
    title: "Temperatura",
    def: "Parámetro que controla la aleatoriedad de la generación: cerca de 0 es determinista y conservador; alto, más diverso y caótico.",
    relatedSlug: "temperatura-y-aleatoriedad",
    updated: "2026-07-26",
    enFrase: "la temperatura",
  },
  attention: {
    title: "Atención",
    def: "El mecanismo por el que cada token decide a qué otros tokens 'mirar' para construir su significado en contexto. El corazón del transformer.",
    updated: "2026-06-24",
    enFrase: "la atención",
  },
  "context-window": {
    title: "Ventana de contexto",
    def: "La cantidad máxima de tokens (entrada + salida) que el modelo puede tener en cuenta a la vez. Si te pasas, se trunca.",
    updated: "2026-06-24",
    enFrase: "la ventana de contexto",
  },
};
