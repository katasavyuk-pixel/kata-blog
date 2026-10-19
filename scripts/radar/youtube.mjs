/**
 * Radar IA — new-YouTube-video detector.
 *
 * Reads the channel's public RSS feed and compares each video ID against the
 * `youtubeId:` values already present in content/posts/**. Videos without a
 * post are written to scratch/youtube-new.json for the writing step.
 *
 * Idempotent and stateless: once a post with that youtubeId is merged, the
 * video stops being "new". No external state to keep in sync.
 *
 * Usage: node scripts/radar/youtube.mjs
 *        (YOUTUBE_CHANNEL_ID=UC... to override the channel)
 */
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const POSTS_DIR = new URL("../../content/posts/", import.meta.url);
const OUT_PATH = new URL("../../scratch/youtube-new.json", import.meta.url);

// Kata Ivanovych's channel. This is public data — it's in the channel URL and in
// the RSS feed this script reads — so it lives here instead of in an env var that
// has to be remembered on every run. Override with YOUTUBE_CHANNEL_ID to point at
// another channel.
const DEFAULT_CHANNEL_ID = "UCizhz3u2FTUjSf-hqvNGKOQ";
const channelId = process.env.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL_ID;

// Video IDs already referenced by a post (any frontmatter `youtubeId: <id>`).
const knownIds = new Set();
for (const file of await readdir(POSTS_DIR, { recursive: true })) {
  if (!file.endsWith(".mdx")) continue;
  const text = await readFile(new URL(file, POSTS_DIR), "utf8");
  const match = text.match(/^youtubeId:\s*["']?([\w-]{6,})["']?\s*$/m);
  if (match) knownIds.add(match[1]);
}

/**
 * YouTube's channel feed answers 404 for hours at a time and then works again:
 * 13 of the 30 runs before 14 Oct 2026 failed on it, with the right channel
 * id, and six requests in a row at 00:20 UTC that day all got the same 404.
 * Three tries a minute apart, and if it is still down this run finds nothing
 * new and says so as a warning: the next run is six hours away and a missed
 * one only delays a draft. Anything else (the feed parses into nothing, a
 * network error that is not a timeout) still fails the job.
 */
const FEED = process.env.YOUTUBE_FEED_URL ?? `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
const PAUSA_MS = Number(process.env.YOUTUBE_RETRY_MS ?? 60_000);

async function leerFeed() {
  let ultimo = "";
  for (let intento = 1; intento <= 3; intento += 1) {
    try {
      const res = await fetch(FEED, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) return await res.text();
      ultimo = `HTTP ${res.status}`;
      if (res.status !== 404 && res.status < 500) throw new Error(`YouTube feed ${ultimo}`);
    } catch (error) {
      if (error?.name !== "TimeoutError") throw error;
      ultimo = "timeout";
    }
    if (intento < 3) await new Promise((r) => setTimeout(r, PAUSA_MS));
  }
  return { caido: ultimo };
}

const feed = await leerFeed();
await mkdir(new URL(".", OUT_PATH), { recursive: true });
if (typeof feed !== "string") {
  await writeFile(OUT_PATH, JSON.stringify({ checkedAt: new Date().toISOString(), videos: [], feedDown: feed.caido }, null, 2));
  console.log(`::warning title=YouTube::El feed del canal no responde (${feed.caido}, tres intentos). Sin vídeos nuevos en esta pasada; la siguiente es en 6 h.`);
  process.exit(0);
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const doc = parser.parse(feed);
if (!doc?.feed) throw new Error("El feed de YouTube respondió, pero no es un feed Atom.");
const entries = [doc?.feed?.entry ?? []].flat();

/**
 * Shorts get no post while the site hides them (Kata, 2026-10-15: «vídeos
 * verticales no los pongas de momento»). The switch is `MOSTRAR_CORTOS` in
 * src/lib/youtube.ts, read from its source so there is one switch, not two;
 * a Short is recognised the same way `isShortEntry` does there. Until 16 Oct
 * 2026 this drafted all five Shorts of September into #16.
 */
const fuenteYoutube = await readFile(new URL("../../src/lib/youtube.ts", import.meta.url), "utf8");
const interruptor = fuenteYoutube.match(/^export const MOSTRAR_CORTOS = (true|false);$/m);
if (!interruptor) throw new Error("No encuentro `export const MOSTRAR_CORTOS = true|false;` en src/lib/youtube.ts.");
const mostrarCortos = interruptor[1] === "true";

function esCorto(entry) {
  const enlaces = [entry.link ?? []].flat().map((link) => String(link?.["@_href"] ?? ""));
  const texto = `${entry.title ?? ""} ${entry["media:group"]?.["media:description"] ?? ""}`;
  return enlaces.some((href) => href.includes("/shorts/")) || /#shorts?\b|#reels?\b/i.test(texto);
}

const cortos = mostrarCortos ? [] : entries.filter(esCorto);
const newVideos = entries
  .filter((entry) => !cortos.includes(entry))
  .map((entry) => ({
    videoId: entry["yt:videoId"],
    title: String(entry.title ?? ""),
    publishedAt: entry.published ?? "",
    description: String(entry["media:group"]?.["media:description"] ?? "").slice(0, 2000),
    url: `https://www.youtube.com/watch?v=${entry["yt:videoId"]}`,
  }))
  .filter((v) => v.videoId && !knownIds.has(v.videoId));

await writeFile(
  OUT_PATH,
  JSON.stringify({ checkedAt: new Date().toISOString(), videos: newVideos }, null, 2),
);

console.log(
  `${entries.length} videos in feed, ${cortos.length} Shorts skipped, ${knownIds.size} already have a post, ${newVideos.length} new → scratch/youtube-new.json`,
);
