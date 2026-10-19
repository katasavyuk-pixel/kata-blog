/**
 * IndexNow — which public URL a changed content file affects, if any.
 *
 * Pure, so tests/indexacion.test.ts can hold it to the same rule the site
 * applies (`esIndexable` in src/lib/posts.ts, the gate in
 * src/lib/newsletter-archive.ts). The CLI in indexnow.mjs only adds git and the
 * network.
 *
 * Until 13-Oct-2026 the frontmatter was read with `split(/^---\r?\n/)[2]`. With
 * no `m` flag that pattern matches once, at the start of the file, so the
 * result was always empty: drafts were announced and sent newsletter editions
 * never were.
 */

/** YAML frontmatter of a content file, or "" when it has none. */
export function frontmatterOf(text) {
  return text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
}

const is = (front, key, value) =>
  new RegExp(`^${key}:[ \\t]*["']?${value}["']?[ \\t]*$`, "m").test(front);

/**
 * The URL to announce for `file` (repo-relative) with content `text`, or null:
 * a URL that is not public, or that asks not to be indexed, is not announced.
 */
export function publicUrlFor(file, text) {
  const front = frontmatterOf(text);

  if (file.startsWith("content/posts/") && file.endsWith(".mdx")) {
    if (is(front, "draft", "true") || is(front, "premium", "true")) return null;
    // An automated news piece is `noindex, follow` until a person reviews it.
    if (is(front, "formato", "radar") && !is(front, "revisado", "true")) return null;
    return `/blog/${file.slice("content/posts/".length).replace(/\.mdx$/, "")}`;
  }

  if (file.startsWith("content/newsletters/") && file.endsWith(".md")) {
    // The web archive only renders an edition that was really sent.
    if (!is(front, "sent", "true")) return null;
    return `/newsletter/${file.slice("content/newsletters/".length).replace(/\.md$/, "")}`;
  }

  return null;
}
