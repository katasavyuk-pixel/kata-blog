/**
 * The interactive-essay kit (phase 4). Registered in the MDX component map
 * (src/components/mdx/widgets/index.ts); models live in
 * src/lib/piezas/registry.ts and are referenced by string id from MDX.
 */
export { Pieza } from "./pieza";
export { Puntuador } from "./puntuador";
export { Calculadora } from "./calculadora";
export { Comparador, Lado } from "./comparador";
export { PasoAPaso, Paso } from "./paso-a-paso";
export { Revelar } from "./revelar";
export { Correo } from "./correo";
export { EnviarResultado } from "./enviar-resultado";

/**
 * Component names that make a post "a post with pieces" — the article page
 * shows the reading-progress bar for these regardless of length. Matched
 * against the compiled MDX, where each component appears by name.
 */
export const NOMBRES_PIEZA = [
  "Pieza",
  "Puntuador",
  "Calculadora",
  "Comparador",
  "PasoAPaso",
  "Revelar",
  "CostCalculator",
  "TokenizerPlayground",
  "TemperatureSandbox",
  "RagSandbox",
  "LifeOfAPrompt",
  "AgentLoop",
  "EvalBench",
  "NoMeDaLaVida",
] as const;
