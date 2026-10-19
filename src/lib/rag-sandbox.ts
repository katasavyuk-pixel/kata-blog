/**
 * The lexical scorer behind the RagSandbox widget (src/components/mdx/widgets/rag-sandbox.tsx).
 *
 * Extracted from the component so the behavior a reader plays with is fixed
 * by tests instead of living only in a client island: the demo's honesty
 * depends on this arithmetic doing exactly what the widget's math panel says
 * it does. The tokenizer is deliberately naive and that is the point — it is
 * the transparent cousin of an embedding, and "explainable by hand" is the
 * whole pedagogical bet.
 */

const STOPWORDS = new Set([
  "de", "la", "el", "los", "las", "un", "una", "y", "o", "en", "que",
  "del", "al", "es", "por", "con", "para", "su", "sus", "lo", "a",
]);

/** Lowercase, strip accents and punctuation, drop stopwords, naive de-plural. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));
}

/**
 * Query-term coverage: the fraction of the question's terms that appear in
 * the chunk. Chosen over Jaccard on purpose — it answers the reader's actual
 * question ("¿este fragmento contiene lo que pregunté?") and its arithmetic
 * fits in the widget's math panel in one line.
 */
export function retrievalScore(question: string, chunk: string): number {
  const q = tokenize(question);
  if (q.length === 0) return 0;
  const c = new Set(tokenize(chunk));
  const hits = q.filter((term) => c.has(term)).length;
  return hits / q.length;
}
