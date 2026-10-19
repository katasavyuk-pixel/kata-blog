import fuentes from "../../config/radar-sources.json" with { type: "json" };

/**
 * The outlet behind a feed.
 *
 * An edition names the feed an item came from («TechCrunch AI», «The Guardian
 * AI»): that label is what the gate verifies, so it stays in the files. What a
 * reader is told is the outlet («TechCrunch», «The Guardian»), which
 * config/radar-sources.json keeps next to each feed as `medio`.
 *
 * The file is imported, not read from disk: it travels inside the bundle, so
 * the answer is the same while the site is built and when a page revalidates.
 * A label the file does not know (a feed that was removed, an old edition) is
 * shown as written.
 */
const MEDIOS = new Map(
  (fuentes.sources as { name: string; medio?: string }[]).map((fuente) => [fuente.name, fuente.medio ?? fuente.name]),
);

export function medioDe(fuente: string): string {
  return MEDIOS.get(fuente) ?? fuente;
}
