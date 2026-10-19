import { rssResponse } from "@/lib/feed";
import { getNoticias } from "@/lib/posts";
import { feeds } from "@/config/site";
import { ESTANTE_DESCRIPTIONS } from "@/config/taxonomy";
import { ETIQUETA_IA } from "@/config/noticias";

export const dynamic = "force-static";
export const revalidate = 3600;

/** The automated news editions, and nothing else. Same generator as /feed.xml. */
export function GET() {
  return rssResponse({
    posts: getNoticias(),
    title: feeds.noticias.title,
    // A feed reader shows this and nothing else about the channel, so the
    // disclosure travels with it.
    description: `${ESTANTE_DESCRIPTIONS.noticias} ${ETIQUETA_IA}.`,
    feedPath: feeds.noticias.href,
    sitePath: "/noticias",
  });
}
