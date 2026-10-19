import type { ReactNode } from "react";
import { Revelar } from "@/components/pieza/revelar";

/**
 * "Commit a guess, then reveal" — now an alias of `Revelar`.
 *
 * It used to keep the answer in client state and render it only after a
 * click, so the server HTML (and every crawler) never had it. `Revelar` is a
 * native `<details>`: same mechanic for the reader, answer in the HTML. Kept
 * under the old name so an MDX body that still writes <GuessReveal> works.
 */
export function GuessReveal({
  prompt,
  revealLabel = "Revelar respuesta",
  children,
}: {
  prompt?: ReactNode;
  revealLabel?: string;
  children: ReactNode;
}) {
  return (
    <Revelar pregunta={prompt ?? "¿Qué crees que sale?"} boton={revealLabel}>
      {children}
    </Revelar>
  );
}
