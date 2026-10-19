import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Paths no crawler should walk, in one constant.
 *
 * The repetition below is the point, not redundancy: under RFC 9309 §2.2.1 a
 * bot that finds a group carrying its own name ignores the `*` group entirely.
 * Welcoming GPTBot with a bare `Allow: /` would hand it everything this list
 * keeps out. One source means a protection cannot be relaxed for one crawler
 * without being relaxed for all of them, which is the property worth having.
 *
 * `/panel` is deliberately NOT here. It carries `robots: { index: false }`
 * already, so naming it buys nothing — and robots.txt is a public file, so it
 * would broadcast the path. The whole reason the admin route is `/panel` and
 * not `/admin` is that `/admin` is what gets scanned; listing it here undoes
 * that in one line.
 */
const PRIVATE_PATHS = ["/api/", "/gracias", "/baja"];

/**
 * AI crawlers named on purpose.
 *
 * None of them needs to be named to get in — the `*` group already allows
 * everything, and nothing here has ever been blocked. They are named so that
 * "does this site let generative engines read it?" is a line you can read
 * rather than an absence you have to infer. Same list the GEO audit script
 * checks (scripts/geo/audit-ssr.mjs), plus the ones that split crawling from
 * live fetching.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  // Anthropic's search and user-fetch agents (17-oct-2026). They already got in
  // through `*`; named so the welcome is readable, like the rest of the list.
  "Claude-SearchBot",
  "Claude-User",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Amazonbot",
  "CCBot",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        // The same constant, on purpose. See PRIVATE_PATHS.
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
