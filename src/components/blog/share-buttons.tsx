"use client";

import { useState, useSyncExternalStore } from "react";
import { copyText } from "@/lib/copy-text";

const noopSubscribe = () => () => {};

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  // The share sheet only exists where the browser has one (phones, Safari).
  // Read through useSyncExternalStore so the server render and hydration agree
  // on `false` and the button appears right after, with no mismatch.
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
  const enc = encodeURIComponent;
  const xUrl = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;

  function flash(next: "copied" | "failed") {
    setStatus(next);
    window.setTimeout(() => setStatus("idle"), 2000);
  }

  async function copyLink() {
    flash((await copyText(url)) ? "copied" : "failed");
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url });
    } catch (error) {
      // Dismissing the sheet rejects with AbortError: that is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyLink();
    }
  }

  // 44px minimum height: a thumb target on a phone, not a desktop chip.
  const itemClass =
    "inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 font-sans text-sm text-muted transition-colors hover:border-accent hover:text-fg";

  // One quiet row at the foot of the article, next to the tags (2026-10-14:
  // the side rail it lived in left with the redesign). The page draws the rule
  // above it.
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="font-sans text-[0.9375rem] font-semibold text-muted">
        Compartir
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {canShare ? (
          <button type="button" onClick={nativeShare} className={itemClass}>
            Compartir…
          </button>
        ) : null}
        <a href={xUrl} target="_blank" rel="noopener noreferrer" className={itemClass}>
          X
        </a>
        <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className={itemClass}>
          LinkedIn
        </a>
        <button type="button" onClick={copyLink} className={itemClass}>
          {status === "copied" ? "¡Copiado!" : "Copiar enlace"}
        </button>
      </div>
      {/* Announced to screen readers; the visible label above changes too. */}
      <p role="status" aria-live="polite" className="sr-only">
        {status === "copied" ? "Enlace copiado" : status === "failed" ? "No se pudo copiar el enlace" : ""}
      </p>
      {status === "failed" ? (
        <p className="mt-2 break-all font-mono text-xs text-muted">
          Cópialo a mano: <span className="select-all text-fg">{url}</span>
        </p>
      ) : null}
    </div>
  );
}
