import { Callout } from "./callout";
import { CostCalculator } from "./cost-calculator";
import { AgentLoop } from "./agent-loop";
import { EvalBench } from "./eval-bench";
import { GuessReveal } from "./guess-reveal";
import { HallucinationQuiz } from "./hallucination-quiz";
import { LifeOfAPrompt } from "./life-of-a-prompt";
import { Param } from "./param";
import { PreciosModelos } from "./precios-modelos";
import { PromptDiff } from "./prompt-diff";
import { Quiz } from "./quiz";
import { RadarItem } from "./radar-item";
import { RagSandbox } from "./rag-sandbox";
import { TemperatureSandbox } from "./temperature-sandbox";
import { Term } from "./term";
import { TokenizerPlayground } from "./tokenizer-playground";
import { WidgetFrame } from "./widget-frame";
import { YouTubeEmbed } from "./youtube-embed";
import { NoMeDaLaVida } from "@/components/tools/no-me-da-la-vida";
import { Secuencia } from "@/components/newsletter/secuencia";
import {
  Calculadora,
  Comparador,
  Correo,
  EnviarResultado,
  Lado,
  Paso,
  PasoAPaso,
  Pieza,
  Puntuador,
  Revelar,
} from "@/components/pieza";

/**
 * Interactive widgets available inside MDX posts. Passed straight to
 * <MDXContent components={widgets} /> — authors write <TokenizerPlayground/>,
 * <Quiz/>, <Term id="token">…</Term> etc. in markdown.
 *
 * `SuscripcionInline` is deliberately NOT here: it needs the post's frontmatter
 * for its copy, and the MDX body cannot see it. The article page adds it to this
 * map already bound to the post. Authors still write a bare
 * <SuscripcionInline /> — a post that uses it outside that page renders nothing
 * rather than an unstyled tag, which is the failure mode we want.
 */
export const widgets = {
  AgentLoop,
  Callout,
  CostCalculator,
  EvalBench,
  GuessReveal,
  HallucinationQuiz,
  LifeOfAPrompt,
  Param,
  PreciosModelos,
  PromptDiff,
  Quiz,
  RadarItem,
  RagSandbox,
  TemperatureSandbox,
  Term,
  TokenizerPlayground,
  WidgetFrame,
  YouTubeEmbed,
  NoMeDaLaVida,
  // Phase 4 kit — see src/components/pieza/.
  Pieza,
  Puntuador,
  Calculadora,
  Comparador,
  Lado,
  PasoAPaso,
  Paso,
  Revelar,
  Correo,
  EnviarResultado,
  // A system's steps and where each one broke, as in the newsletter (N1):
  // <Secuencia titulo="…" pasos={[{ titulo: "…", detalle: "…", fallo: "…" }]} />
  Secuencia,
};
