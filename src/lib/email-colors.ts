/**
 * Brand colors for transactional/newsletter emails: the site's paper, ink and
 * red (2026-10-15, the short visual newsletter Kata chose).
 *
 * React Email renders inline styles and has no access to the CSS theme tokens in
 * globals.css, so the values are repeated here. Keep them in sync with the
 * @theme block there: same names in the comments, same contrast reasoning
 * (red as a surface for buttons and rules, the darker red for text).
 */
export const emailColors = {
  bg: "#eee7e4", // --color-surface-2: the paper around the letter
  card: "#ffffff", // --color-panel: the letter
  surface: "#f2edeb", // --color-surface: boxes inside it («En un minuto», the footer)
  textMain: "#140a0d", // --color-fg: warm black ink
  textSoft: "#3f3236", // --color-chrome: body copy one step down
  textMuted: "#5e4b50", // --color-muted: dates, metadata
  accent: "#c40f1f", // --color-accent-ink: red text and links (5.82:1 on white)
  rule: "#e11423", // --color-accent: red rules and the top border, never small text
  buttonBg: "#e11423", // --color-accent: the button surface
  onAccent: "#ffffff", // --color-on-accent: white on red (4.85:1)
  border: "#e3d9d6", // --color-border: hairlines
} as const;

/** Serif for headings, sans for everything else: the two every mail client has. */
export const emailFonts = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "Arial, Helvetica, sans-serif",
} as const;
