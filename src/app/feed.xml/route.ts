import { rssResponse } from "@/lib/feed";
import { getEditoriales } from "@/lib/posts";
import { feeds, siteConfig } from "@/config/site";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * The main feed: what I write. The automated daily editions moved to
 * /noticias/feed.xml, so following the site no longer means an item a day.
 */
export function GET() {
  return rssResponse({
    posts: getEditoriales(),
    title: feeds.editorial.title,
    description: siteConfig.description,
    feedPath: feeds.editorial.href,
  });
}
