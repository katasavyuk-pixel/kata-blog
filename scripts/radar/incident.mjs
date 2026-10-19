/**
 * Daily news — what state the day is in, and one rolling incident when it breaks.
 *
 * The workflow runs several times a day and has to be safe to repeat, so the
 * first thing it asks is `status`: is today's edition already on main, did the
 * last deploy of main go through, and is an incident already open?
 *
 * `report` runs last and keeps a single issue (label `noticias-averia`) telling
 * the story: opened by the first failed attempt, one comment per later failure,
 * closed by the first run that sees an edition published. A new issue per bad
 * day would be noise nobody reads; twenty-four failures in thirty days went
 * unnoticed exactly that way.
 *
 * The decisions are pure functions (`decide`, `failedSteps`, the bodies) and the
 * GitHub calls go through an injected `api`, so tests/noticias-averia.test.ts
 * runs all of it without the network.
 *
 * Usage: node scripts/radar/incident.mjs status|report
 * Env:   GITHUB_TOKEN, GITHUB_REPOSITORY; `report` also reads EDITION_DATE,
 *        EDITION, DEPLOY, INCIDENT, PIPELINE, CLAUDE_REASON, GITHUB_RUN_ID.
 */
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const INCIDENT_LABEL = "noticias-averia";
export const INCIDENT_TITLE = "Noticias: la publicación diaria está fallando";

const INCIDENT_INTRO =
  "La publicación automática de noticias no está saliendo. Cada intento fallido añade aquí un comentario con el paso que falló, y la incidencia se cierra sola cuando vuelve a publicarse una edición.";

export const editionPath = (date) => `content/posts/noticias-${date}.mdx`;

/** @typedef {(method: string, path: string, body?: Record<string, unknown>) => Promise<{ status: number, data: any }>} Api */

/**
 * `api(method, path, body)` against one repository; never throws on an HTTP status.
 * @param {{ token: string, repo: string, base?: string, fetchImpl?: typeof fetch }} options
 * @returns {Api}
 */
export function githubApi({ token, repo, base = "https://api.github.com", fetchImpl = fetch }) {
  return async (method, path, body) => {
    const response = await fetchImpl(`${base}/repos/${repo}${path}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { status: response.status, data };
  };
}

/**
 * @param {Api} api
 * @param {string} date
 * @returns {Promise<{ edition: "published" | "missing", deploy: string, incident: number | null }>}
 */
export async function readState(api, date) {
  const edition = await api("GET", `/contents/${editionPath(date)}?ref=main`);
  if (edition.status !== 200 && edition.status !== 404) {
    // Guessing "missing" here would write and push a second edition.
    throw new Error(`cannot tell whether the ${date} edition is on main (HTTP ${edition.status})`);
  }

  // Vercel reports each deploy as a commit status; no need to poll the site.
  const status = await api("GET", "/commits/main/status");
  const vercel = status.status === 200 ? status.data?.statuses?.find((s) => /vercel/i.test(s.context)) : undefined;
  const deploy = !vercel ? "unknown" : vercel.state === "error" ? "failure" : vercel.state;

  const open = await api("GET", `/issues?labels=${INCIDENT_LABEL}&state=open&per_page=1`);
  const incident = open.status === 200 ? (open.data?.[0]?.number ?? null) : null;

  return { edition: edition.status === 200 ? "published" : "missing", deploy, incident };
}

/**
 * What to do with the incident, given how the run went.
 *
 * `edition` and `deploy` were read before anything was written; `pipeline` is
 * the result of the job that writes and publishes (`skipped` when the edition
 * was already there). An empty `edition` means the state itself could not be read.
 *
 * @param {{ edition: string, deploy: string, pipeline: string }} run
 * @returns {{ kind: "pipeline" | "state" | "deploy" | "recovered" | "none" }}
 */
export function decide({ edition, deploy, pipeline }) {
  if (!edition) return { kind: "state" };
  if (pipeline === "failure" || pipeline === "cancelled") return { kind: "pipeline" };
  if (edition === "published" && deploy === "failure") return { kind: "deploy" };
  // A run that has just published cannot know yet whether its deploy went
  // through: the next attempt of the day reads that and reopens if it did not.
  if (pipeline === "success" || (edition === "published" && deploy === "success")) return { kind: "recovered" };
  return { kind: "none" };
}

/**
 * Failed steps of a run, as `job › step`; a job that died without one is named alone.
 * @param {{ name: string, conclusion: string | null, steps?: { name: string, conclusion: string | null }[] }[] | undefined} jobs
 * @returns {string[]}
 */
export function failedSteps(jobs) {
  const out = [];
  for (const job of jobs ?? []) {
    if (job.conclusion !== "failure" && job.conclusion !== "cancelled" && job.conclusion !== "timed_out") continue;
    const steps = (job.steps ?? []).filter((step) => step.conclusion === "failure");
    if (steps.length === 0) out.push(`${job.name} (terminó como ${job.conclusion} sin ningún paso fallido: runner o tiempo agotado)`);
    for (const step of steps) out.push(`${job.name} › ${step.name}`);
  }
  return out;
}

const oneLine = (text, max = 300) => {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

/**
 * One entry of the incident: the first becomes the issue body, the rest are comments.
 * @param {{ kind: string, date: string, time: string, runUrl?: string, commitsUrl?: string, failed?: string[], claudeReason?: string }} details
 */
export function entry({ kind, date, time, runUrl, commitsUrl, failed = [], claudeReason = "" }) {
  const heading = `**${date}, ${time} UTC**`;
  const run = runUrl ? ` ([ver la ejecución](${runUrl}))` : "";
  if (kind === "deploy") {
    return `${heading}\n\nLa edición de hoy está en \`main\`, pero el último despliegue de Vercel falló: el sitio sigue enseñando la versión anterior. El error está en el panel de Vercel, en el despliegue del último commit${commitsUrl ? ` ([commits de main](${commitsUrl}))` : ""}.`;
  }
  if (kind === "state") {
    return `${heading}\n\nNo se pudo comprobar si la edición de hoy estaba publicada, así que este intento no escribió nada${run}. El siguiente intento programado empieza de cero.`;
  }
  const where = failed.length > 0 ? `Falló en: ${failed.map((name) => `«${name}»`).join(", ")}` : "No hay ningún paso marcado como fallido";
  const reason = claudeReason ? `\n\nLo que respondió Claude al pararse: «${oneLine(claudeReason)}»` : "";
  return `${heading}\n\nHoy todavía no hay edición. ${where}${run}.${reason}\n\nEl siguiente intento programado empieza de cero. Si era el último del día, se puede lanzar a mano en Actions → «Noticias diarias» → Run workflow.`;
}

/**
 * Apply the decision. Returns what was done, for the log and the tests.
 * @param {Api} api
 * @param {{ state: { edition: string, deploy: string, incident: number | null }, pipeline: string, date: string, time: string, runId?: string, repoUrl?: string, claudeReason?: string }} run
 * @returns {Promise<"opened" | "commented" | "closed" | "nothing">}
 */
export async function report(api, { state, pipeline, date, time, runId, repoUrl, claudeReason }) {
  const { kind } = decide({ ...state, pipeline });
  const incident = state.incident || null;

  if (kind === "none") return "nothing";

  if (kind === "recovered") {
    if (!incident) return "nothing";
    await api("POST", `/issues/${incident}/comments`, {
      body: `**${date}, ${time} UTC**\n\nLa edición de ${date} está publicada. Cierro la incidencia.`,
    });
    await api("PATCH", `/issues/${incident}`, { state: "closed", state_reason: "completed" });
    return "closed";
  }

  let failed = [];
  if (kind === "pipeline" && runId) {
    const jobs = await api("GET", `/actions/runs/${runId}/jobs?per_page=30`);
    if (jobs.status === 200) failed = failedSteps(jobs.data?.jobs);
  }
  const body = entry({
    kind,
    date,
    time,
    failed,
    claudeReason,
    runUrl: repoUrl && runId ? `${repoUrl}/actions/runs/${runId}` : "",
    commitsUrl: repoUrl ? `${repoUrl}/commits/main` : "",
  });

  if (incident) {
    await api("POST", `/issues/${incident}/comments`, { body });
    return "commented";
  }
  // 422 = the label is already there. Anything else shows up when the issue is created.
  await api("POST", "/labels", {
    name: INCIDENT_LABEL,
    color: "b60205",
    description: "La publicación diaria de noticias no está saliendo",
  });
  const created = await api("POST", "/issues", {
    title: INCIDENT_TITLE,
    body: `${INCIDENT_INTRO}\n\n${body}`,
    labels: [INCIDENT_LABEL],
  });
  if (created.status !== 201) throw new Error(`could not open the incident (HTTP ${created.status})`);
  return "opened";
}

const utc = (now) => ({ date: now.toISOString().slice(0, 10), time: now.toISOString().slice(11, 16) });

async function main(command, env) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required");
  }
  const api = githubApi({
    token: env.GITHUB_TOKEN,
    repo: env.GITHUB_REPOSITORY,
    base: env.GITHUB_API_URL || undefined,
  });
  const now = utc(new Date());

  if (command === "status") {
    const date = env.EDITION_DATE || now.date;
    const state = await readState(api, date);
    const lines = [
      `date=${date}`,
      `edition=${state.edition}`,
      `deploy=${state.deploy}`,
      `incident=${state.incident ?? ""}`,
    ];
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
    console.log(lines.join("  "));
    return;
  }

  if (command === "report") {
    const done = await report(api, {
      state: {
        edition: env.EDITION || "",
        deploy: env.DEPLOY || "unknown",
        incident: Number(env.INCIDENT) || null,
      },
      pipeline: env.PIPELINE || "",
      date: env.EDITION_DATE || now.date,
      time: now.time,
      runId: env.GITHUB_RUN_ID,
      repoUrl: env.GITHUB_SERVER_URL ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}` : "",
      claudeReason: env.CLAUDE_REASON || "",
    });
    console.log(`incident: ${done}`);
    return;
  }

  throw new Error("Usage: node scripts/radar/incident.mjs status|report");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main(process.argv[2], process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
