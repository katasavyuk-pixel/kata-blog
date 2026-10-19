/**
 * Placeholder substitution for the markdown-authored sequence emails.
 *
 * The copy lives in content/emails/*.md so it can be edited without touching
 * TypeScript. But the first email has to say the reader's own numbers back to
 * them, and markdown cannot do that. Rather than reach for a templating engine,
 * a fixed, documented set of `{{names}}` gets replaced with pre-rendered HTML.
 *
 * The strict part matters: an unknown or misspelled placeholder **throws**. The
 * alternative is shipping a literal `{{desglse}}` to every subscriber, and there
 * is no way to unsend that. Callers catch the error and skip the step, so a typo
 * costs one missing email rather than a visibly broken one.
 */

export class TemplateError extends Error {}

export type TemplateVars = Record<string, string>;

/**
 * Anything left between braces after substitution, not just a well-formed name.
 *
 * It used to be `/\{\{\s*([a-z_]+)\s*\}\}/g`, which only caught a placeholder
 * that still looked like one. That is too narrow to be a guard: the whole point
 * is to refuse to send a body whose braces did not resolve, whatever is inside.
 */
const PLACEHOLDER = /\{\{[\s\S]*?\}\}/g;

/**
 * Undo the percent-encoding Velite applies to a placeholder inside a link.
 *
 * `s.markdown()` treats the destination of `[Empezar]({{url_sitio}}/empieza-aqui)`
 * as a URL and encodes the braces, so the compiled HTML carries
 * `href="%7B%7Burl_sitio%7D%7D/empieza-aqui"`. Nothing downstream matched that:
 * the substitution regex looked for literal braces and found none, and — worse —
 * neither did the leftover guard, so the email rendered "cleanly" and went out
 * with every CTA pointing at a path that does not exist.
 *
 * It shipped that way from 2026-07-29 until 2026-08-21. Two of the three welcome
 * emails no longer contained a single literal `{{` by the time it was found,
 * which is why nothing looked wrong: an email with dead buttons and an email with
 * working ones are byte-identical to the eye.
 *
 * Normalising here rather than at each call site keeps it to one place, and means
 * the guard above sees the placeholder again — a `{{typo}}` inside a link now
 * throws like it always should have.
 */
function decodeEncodedBraces(html: string): string {
  return html.replace(/%7B%7B/gi, "{{").replace(/%7D%7D/gi, "}}");
}

/**
 * Replace every `{{name}}` in `html`, or throw.
 *
 * A placeholder alone on its own markdown line becomes `<p>{{name}}</p>`. Block
 * replacements (a table, a button) cannot legally live inside a `<p>`, so the
 * wrapping paragraph is consumed too. That also means an empty replacement
 * leaves no orphan paragraph behind, which is how "no download for this reader"
 * renders as nothing at all instead of a stray gap.
 */
export function renderTemplate(html: string, vars: TemplateVars): string {
  let out = decodeEncodedBraces(html);

  for (const [name, value] of Object.entries(vars)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // A replacer function, not the value directly: in a replacement string `$&`
    // and ``$` `` are special, and these values are generated HTML that already
    // contains prices like `$0.05`. Harmless today, a corrupted email the day a
    // value happens to contain `$&`.
    const insert = () => value;
    out = out.replace(
      new RegExp(`<p>\\s*\\{\\{\\s*${escaped}\\s*\\}\\}\\s*</p>`, "g"),
      insert,
    );
    out = out.replace(
      new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "g"),
      insert,
    );
  }

  const leftover = [...out.matchAll(PLACEHOLDER)].map((m) => m[0]);
  if (leftover.length > 0) {
    throw new TemplateError(
      `Placeholder sin resolver: ${[...new Set(leftover)].join(", ")}. ` +
        `Revisa el nombre en content/emails/ — los válidos son: ${Object.keys(vars).join(", ")}.`,
    );
  }

  return out;
}

/**
 * Plain-text alternative for an email body.
 *
 * Every message should carry one. Two reasons, and the first is the one that
 * costs money: a `text/html`-only email is a bulk-mail signal, and the welcome
 * sequence was landing in Gmail's Promotions tab. The second is that some clients
 * block HTML entirely, and for them an HTML-only email is a blank message.
 *
 * Derived from the rendered HTML rather than from the markdown source on purpose:
 * that way it includes the personalised blocks (the reader's own cost breakdown,
 * the download link) and cannot drift from what the HTML says.
 *
 * Links become "texto (url)" because a plain-text reader cannot click anything —
 * a bare anchor text would leave them with no way to reach the page.
 */
const NAMED_ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const ENTITY = /&(?:(nbsp|amp|lt|gt|quot|apos)|#x([0-9a-f]{1,6})|#(\d{1,7}));/gi;

/**
 * One pass, so `&amp;lt;` stays the `&lt;` its author typed. Numeric entities
 * matter more than they look: Velite writes the `&` of a link's query string as
 * `&#x26;`, and left alone every tracked link in the plain-text part read
 * `…?utm_source=newsletter&#x26;utm_medium=email…`.
 */
function decodeEntity(entity: string, named?: string, hex?: string, decimal?: string): string {
  if (named) return NAMED_ENTITIES[named.toLowerCase()];
  const code = hex ? Number.parseInt(hex, 16) : Number(decimal);
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
}

export function htmlToText(html: string): string {
  return (
    html
      // Table rows read as "label: value" — that is what the cost breakdown is.
      .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, ": ")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => {
        const label = text.replace(/<[^>]+>/g, "").trim();
        if (!label) return href;
        return href.startsWith("mailto:") ? label : `${label} (${href})`;
      })
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|tr|table|section)>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, "")
      .replace(ENTITY, decodeEntity)
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

/** Escape text destined for an HTML attribute or text node. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
