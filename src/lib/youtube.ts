import { XMLParser } from "fast-xml-parser";

export const YOUTUBE_CHANNEL_ID = "UCizhz3u2FTUjSf-hqvNGKOQ";
export const YOUTUBE_CHANNEL_URL = `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`;
const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
const YOUTUBE_REFRESH_SECONDS = 15 * 60;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,}$/;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export type LatestYouTubeVideo = {
  id: string;
  href: string;
  image: string;
  label: string;
  title: string;
  description: string;
};

const fallbackVideo: LatestYouTubeVideo = {
  id: "7_IBXLlXk-s",
  href: "https://youtu.be/7_IBXLlXk-s",
  image: "https://i.ytimg.com/vi/7_IBXLlXk-s/maxresdefault.jpg",
  label: "Último vídeo",
  title: "Antes del TMS hay otro sistema: tu inbox",
  description:
    "Cómo calcular el coste manual de la documentación de transporte y estimar el ahorro.",
};

type XmlRecord = Record<string, unknown>;

function asRecord(value: unknown): XmlRecord | null {
  return typeof value === "object" && value !== null
    ? (value as XmlRecord)
    : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function toExcerpt(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 160) return normalized;

  const shortened = normalized.slice(0, 160).replace(/\s+\S*$/, "").trim();
  return `${shortened}…`;
}

function isShortEntry(entry: XmlRecord): boolean {
  const links = asArray(entry.link)
    .map(asRecord)
    .map((link) => asText(link?.["@_href"]));
  const mediaGroup = asRecord(entry["media:group"]);
  const text = `${asText(entry.title)} ${asText(mediaGroup?.["media:description"])}`;

  return links.some((href) => href.includes("/shorts/")) || /#shorts?\b|#reels?\b/i.test(text);
}

function parseVideoEntry(entry: XmlRecord): LatestYouTubeVideo | null {
  if (isShortEntry(entry)) return null;

  const id = asText(entry["yt:videoId"]).trim();
  const title = asText(entry.title).trim();
  if (!VIDEO_ID_PATTERN.test(id) || !title) return null;

  const mediaGroup = asRecord(entry["media:group"]);
  const description = toExcerpt(asText(mediaGroup?.["media:description"]));

  return {
    id,
    href: `https://youtu.be/${id}`,
    image: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    label: "Último vídeo",
    title,
    description: description || "Vídeos sobre sistemas, IA y negocio real.",
  };
}

/** Parse the public Atom feed, skipping Shorts/Reels before choosing a video. */
export function parseLatestYouTubeVideo(xml: string): LatestYouTubeVideo | null {
  let document: XmlRecord | null;
  try {
    document = asRecord(parser.parse(xml));
  } catch {
    return null;
  }
  const feed = asRecord(document?.feed);
  for (const candidate of asArray(feed?.entry)) {
    const video = asRecord(candidate);
    if (!video) continue;

    const parsed = parseVideoEntry(video);
    if (parsed) return parsed;
  }

  return null;
}

/** One upload of the channel, long or short, as /videos and the home show it. */
export type YouTubeVideo = {
  id: string;
  /** The title without its hashtags and emoji: they are for YouTube's search, not for a page. */
  title: string;
  href: string;
  /** 480×360 frame; a 16:9 or 9:16 box with `object-cover` crops the bars away. */
  image: string;
  /** ISO date of the upload. */
  published: string;
  short: boolean;
};

/**
 * Uploads that stay off the site: an ID here is never shown, whatever the
 * feed says. For a video Kata no longer wants to stand behind.
 */
export const VIDEOS_OCULTOS: readonly string[] = [];

/** Used when the feed cannot be read: the two long videos, so a page never renders empty. */
const FALLBACK_VIDEOS: YouTubeVideo[] = [
  {
    id: "7_IBXLlXk-s",
    title: "Cómo automatizar pedidos y documentos de transporte con IA",
    href: "https://www.youtube.com/watch?v=7_IBXLlXk-s",
    image: "https://i.ytimg.com/vi/7_IBXLlXk-s/hqdefault.jpg",
    published: "2026-09-04T09:30:45+00:00",
    short: false,
  },
  {
    id: "9OB_O0w-8GI",
    title: "Mi producto funciona, pero ChatGPT no lo recomienda (auditoría GEO)",
    href: "https://www.youtube.com/watch?v=9OB_O0w-8GI",
    image: "https://i.ytimg.com/vi/9OB_O0w-8GI/hqdefault.jpg",
    published: "2026-08-20T21:24:06+00:00",
    short: false,
  },
];

/** «Día 2: “Cuenta Clara”, una aplicación👇 #IA #Tecno» → «Día 2: “Cuenta Clara”, una aplicación». */
export function limpiarTitulo(title: string): string {
  return title
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every upload in the feed, newest first, minus the hidden ones. */
export function parseYouTubeFeed(xml: string): YouTubeVideo[] {
  let document: XmlRecord | null;
  try {
    document = asRecord(parser.parse(xml));
  } catch {
    return [];
  }
  const feed = asRecord(document?.feed);
  const videos: YouTubeVideo[] = [];
  for (const candidate of asArray(feed?.entry)) {
    const entry = asRecord(candidate);
    if (!entry) continue;
    const id = asText(entry["yt:videoId"]).trim();
    const title = limpiarTitulo(asText(entry.title));
    if (!VIDEO_ID_PATTERN.test(id) || !title || VIDEOS_OCULTOS.includes(id)) continue;
    const short = isShortEntry(entry);
    videos.push({
      id,
      title,
      href: short ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
      image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      published: asText(entry.published).trim(),
      short,
    });
  }
  return videos;
}

/**
 * Shorts stay off the site (Kata, 2026-10-15: «vídeos verticales no los pongas
 * de momento»). The feed still marks them; flip this when he wants them back
 * and /videos shows them in their own row again.
 */
export const MOSTRAR_CORTOS = false;

/** What the site shows of the channel: the episodes, and the Shorts only if `MOSTRAR_CORTOS`. */
export function videosVisibles(videos: readonly YouTubeVideo[]): YouTubeVideo[] {
  return MOSTRAR_CORTOS ? [...videos] : videos.filter((video) => !video.short);
}

/**
 * The channel's uploads the site shows (`videosVisibles`). Same feed and same 15-minute ISR as
 * the latest video: a new upload reaches /videos and the home without a
 * deploy. A fetch is not a file read, so the home can call it.
 */
export async function getYouTubeVideos(): Promise<YouTubeVideo[]> {
  try {
    const response = await fetch(YOUTUBE_FEED_URL, {
      headers: { Accept: "application/atom+xml, application/xml" },
      next: { revalidate: YOUTUBE_REFRESH_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return FALLBACK_VIDEOS;
    const videos = videosVisibles(parseYouTubeFeed(await response.text()));
    return videos.length > 0 ? videos : FALLBACK_VIDEOS;
  } catch {
    return FALLBACK_VIDEOS;
  }
}

/**
 * Read the channel's latest upload. ISR refreshes this every 15 minutes, so a
 * new upload replaces the featured video without a code change or redeploy.
 */
export async function getLatestYouTubeVideo(): Promise<LatestYouTubeVideo> {
  try {
    const response = await fetch(YOUTUBE_FEED_URL, {
      headers: { Accept: "application/atom+xml, application/xml" },
      next: { revalidate: YOUTUBE_REFRESH_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return fallbackVideo;
    return parseLatestYouTubeVideo(await response.text()) ?? fallbackVideo;
  } catch {
    return fallbackVideo;
  }
}
