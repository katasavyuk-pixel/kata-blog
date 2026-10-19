/**
 * Where the installable assets of the catalogue live, and how they are
 * installed. One place, because a ficha that prints an install command the
 * repository does not answer to is worse than no ficha.
 *
 * The assets are not in this repo. They live in a public repository that is at
 * once a plugin marketplace (Claude Code and Codex read the same manifest) and
 * a single plugin, with the skills in the Agent Skills format so any agent that
 * reads it can install them too.
 * `ref` is the tag the fichas were written against: bumping a skill means
 * tagging the repository and moving this value in the same change.
 *
 * `entrada` is the skill a reader runs first: it asks about the business once
 * and saves the profile the others adapt to. It is the first step of every
 * ficha, not one more card in a sample.
 */
export const CATALOGO = {
  repo: {
    owner: "katasavyuk-pixel",
    name: "skills-negocio-pequeno",
    /** Tag the fichas describe. */
    ref: "v2.1.0",
  },
  /** `name` of .claude-plugin/marketplace.json: what follows the `@` on install. */
  marketplace: "kata-ivanovych",
  /** `name` of .claude-plugin/plugin.json: the prefix of every skill command. */
  plugin: "negocio-pequeno",
  /** The skill that sets the others up for one business. */
  entrada: "empezar",
} as const;

const SLUG = `${CATALOGO.repo.owner}/${CATALOGO.repo.name}`;

export const CATALOGO_REPO_URL = `https://github.com/${SLUG}`;

/** The two lines that install the whole set in Claude Code. */
export const INSTALAR_EN_CLAUDE_CODE: readonly string[] = [
  `/plugin marketplace add ${SLUG}`,
  `/plugin install ${CATALOGO.plugin}@${CATALOGO.marketplace}`,
];

/** The one line for any other agent that reads Agent Skills: the installer finds the agents on the machine. */
export const INSTALAR_EN_OTROS_AGENTES = `npx skills add ${SLUG}`;

/**
 * The Claude app (claude.ai and desktop), no terminal: the menus to follow, as
 * the Spanish interface labels them, and what to type at the end of them. Read
 * off the app on `comprobado`, installing this very repository; the labels are
 * the app's, so they are checked again whenever the tag moves.
 */
export const INSTALAR_EN_LA_APP = {
  menus: ["Personalización", "Plugins", "Añadir", "Añadir marketplace", "Añadir desde un repositorio"],
  repositorio: SLUG,
  boton: "Sincronizar",
  comprobado: "2026-10-13",
} as const;

/** Codex reads the same marketplace as Claude Code, with no manifest of its own. */
export const INSTALAR_EN_CODEX: readonly string[] = [
  `codex plugin marketplace add ${SLUG}`,
  `codex plugin add ${CATALOGO.plugin}@${CATALOGO.marketplace}`,
];

/** The Agent Skills installer, aimed at one agent by its `-a` name. */
export function npxSkillsPara(agente: string): string {
  return `${INSTALAR_EN_OTROS_AGENTES} -a ${agente}`;
}

/**
 * Where a reader can install the set, in the order the selector offers them.
 * `comprobado` is the day it was installed there from scratch and a skill ran;
 * null means the steps follow that agent's documentation and nobody here has
 * run them, and the page says so. The same list as the repository's README.
 */
export type Agente = {
  id: string;
  nombre: string;
  /** What to copy: a command per line, or the repository for the Claude app. */
  lineas: readonly string[];
  etiqueta: string;
  /** One sentence: where the skills end up, or what to do before the lines. */
  nota: string;
  comprobado: string | null;
};

export const AGENTES: readonly Agente[] = [
  {
    id: "app",
    nombre: "App de Claude",
    lineas: [INSTALAR_EN_LA_APP.repositorio],
    etiqueta: "Repositorio",
    nota: `Sin terminal. En la app: ${INSTALAR_EN_LA_APP.menus.join(" › ")}. Pega esto y pulsa ${INSTALAR_EN_LA_APP.boton}. Queda en tu cuenta.`,
    comprobado: INSTALAR_EN_LA_APP.comprobado,
  },
  {
    id: "claude-code",
    nombre: "Claude Code",
    lineas: INSTALAR_EN_CLAUDE_CODE,
    etiqueta: "Claude Code",
    nota: `Dos líneas. Cada skill se llama con /${CATALOGO.plugin}:nombre, o se activa sola cuando lo que pides encaja.`,
    comprobado: "2026-10-13",
  },
  {
    id: "codex",
    nombre: "Codex",
    lineas: INSTALAR_EN_CODEX,
    etiqueta: "Terminal",
    nota: "Lee el mismo marketplace que Claude Code. Abre una sesión nueva después; también vale npx skills con -a codex.",
    comprobado: "2026-10-15",
  },
  {
    id: "opencode",
    nombre: "OpenCode",
    lineas: [npxSkillsPara("opencode")],
    etiqueta: "Terminal",
    nota: "Las deja en .agents/skills/ de la carpeta donde lo ejecutas; con -g, para todos tus proyectos.",
    comprobado: "2026-10-15",
  },
  {
    id: "antigravity",
    nombre: "Antigravity",
    lineas: [npxSkillsPara("antigravity")],
    etiqueta: "Terminal",
    nota: "Las deja en .agents/skills/ del proyecto, que según su documentación leen la aplicación, el IDE y la CLI.",
    comprobado: null,
  },
  {
    id: "gemini-cli",
    nombre: "Gemini CLI",
    lineas: [npxSkillsPara("gemini-cli")],
    etiqueta: "Terminal",
    nota: "Las deja en .agents/skills/ del proyecto; con -g, en ~/.gemini/skills/.",
    comprobado: null,
  },
  {
    id: "cursor",
    nombre: "Cursor",
    lineas: [npxSkillsPara("cursor")],
    etiqueta: "Terminal",
    nota: "Las deja en .agents/skills/ del proyecto; con -g, en ~/.cursor/skills/.",
    comprobado: null,
  },
  {
    id: "github-copilot",
    nombre: "GitHub Copilot",
    lineas: [npxSkillsPara("github-copilot")],
    etiqueta: "Terminal",
    nota: "Las deja en .agents/skills/ del repositorio, que leen el agente de Copilot, su CLI y el modo agente de VS Code.",
    comprobado: null,
  },
  {
    id: "otro",
    nombre: "Otro agente",
    lineas: [INSTALAR_EN_OTROS_AGENTES],
    etiqueta: "Terminal",
    nota: "El instalador busca los agentes que tienes y te pregunta en cuáles. Sin instalador, copia la carpeta de cada skill en la de skills de tu agente: cada una funciona sola.",
    comprobado: null,
  },
];


/** A file of the repository as a reader opens it, pinned to the described tag. */
export function urlEnRepo(ruta: string): string {
  return `${CATALOGO_REPO_URL}/blob/${CATALOGO.repo.ref}/${ruta}`;
}

/** A folder of the repository, pinned to the described tag. */
export function carpetaEnRepo(ruta: string): string {
  return `${CATALOGO_REPO_URL}/tree/${CATALOGO.repo.ref}/${ruta}`;
}

/** How a skill is called once the plugin is installed. */
export function comandoDeSkill(nombre: string): string {
  return `/${CATALOGO.plugin}:${nombre}`;
}
