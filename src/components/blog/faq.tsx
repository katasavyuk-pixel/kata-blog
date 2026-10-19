import type { Post } from "@/lib/posts";

/**
 * The questions an article answers, at its foot and in the open.
 *
 * Plain headings and paragraphs, not an accordion: the answer is the content,
 * and a reader skimming for one of these questions should not have to click to
 * find out whether it is here. The same `faq` array feeds `faqJsonLd` on the
 * page, so the structured data cannot say anything the reader does not see.
 * Renders nothing when the post declares no questions.
 */
export function Faq({ items }: { items: Post["faq"] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="preguntas-frecuentes" className="not-prose mt-14 border-t border-border pt-8">
      <h2 id="preguntas-frecuentes" className="text-h2">
        Preguntas frecuentes
      </h2>
      <dl className="mt-6 space-y-7">
        {items.map((item) => (
          <div key={item.q}>
            <dt className="font-sans text-h3">{item.q}</dt>
            <dd className="mt-2 leading-relaxed text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
