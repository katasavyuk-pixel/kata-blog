"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement: adds a "Copiar" button to every code block rendered
 * by rehype-pretty-code. Runs once after mount; no-op if clipboard unavailable.
 */
export function CopyCode() {
  useEffect(() => {
    const figures = document.querySelectorAll<HTMLElement>(
      "[data-rehype-pretty-code-figure]",
    );
    figures.forEach((figure) => {
      if (figure.querySelector(".copy-code-btn")) return;
      const pre = figure.querySelector("pre");
      if (!pre) return;

      figure.style.position = "relative";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-code-btn";
      button.textContent = "Copiar";
      button.addEventListener("click", () => {
        navigator.clipboard
          .writeText(pre.innerText)
          .then(() => {
            button.textContent = "¡Copiado!";
            window.setTimeout(() => {
              button.textContent = "Copiar";
            }, 1500);
          })
          .catch(() => {});
      });
      figure.appendChild(button);
    });
  }, []);

  return null;
}
