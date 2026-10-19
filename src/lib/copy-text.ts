/**
 * Copy text to the clipboard, including where the async Clipboard API is
 * missing or refused (older iOS Safari, in-app browsers, non-secure contexts).
 * Returns whether it worked, so the caller can show a manual-copy fallback
 * instead of a button that silently does nothing.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context: fall through to the legacy path.
  }
  return legacyCopy(text);
}

/** `execCommand("copy")` on a throwaway, selected textarea. */
function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  // 16px keeps iOS from zooming the page when the field is focused.
  field.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
  document.body.appendChild(field);
  field.focus();
  field.select();
  field.setSelectionRange(0, text.length);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(field);
  }
}
