import { jsonLdScript } from "@/lib/jsonld";

/**
 * Emits one or more JSON-LD graphs.
 *
 * The only way structured data should reach the DOM in this codebase: the `<`
 * escape lives in `jsonLdScript`, so no page can forget it.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  const graphs = Array.isArray(data) ? data : [data];
  return (
    <>
      {graphs.map((graph, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }}
        />
      ))}
    </>
  );
}
