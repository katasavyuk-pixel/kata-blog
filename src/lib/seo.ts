import type { Metadata } from "next";
import { feedAlternates, siteConfig } from "@/config/site";
import { esIndexable, type Post } from "@/lib/posts";

/**
 * The metadata of an article page, as data.
 *
 * It lives here and not in the page because a page file carries JSX, which the
 * test runner cannot import: tests/indexacion.test.ts and
 * tests/seo-snippets.test.ts call these functions directly, so what they check
 * is what the page emits.
 */

/** Google truncates a result title around here; the test holds every indexable post to it. */
export const TITULO_MAX = 60;
/** …and a description around here. */
export const DESCRIPCION_MAX = 155;

/**
 * The string that ends up in <title>. `seoTitle` replaces the whole thing;
 * without it the layout's template appends the site name to the H1.
 */
export function tituloEfectivo(post: Pick<Post, "title" | "seoTitle">): string {
  return post.seoTitle ?? `${post.title} · ${siteConfig.name}`;
}

export function metadataDePost(post: Post): Metadata {
  return {
    // `absolute` ignores the layout's `%s · Kata Ivanovych` template, so a
    // seoTitle has the full width. The H1 and og:title keep `title`: the first
    // is for the reader, the second for whoever sees the link shared.
    title: post.seoTitle ? { absolute: post.seoTitle } : post.title,
    description: post.description,
    alternates: { ...feedAlternates, canonical: post.permalink },
    // Metadata merges shallowly per segment: this replaces the layout's
    // `robots` on the pages that need it and leaves it alone everywhere else.
    ...(esIndexable(post) ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "article",
      locale: "es_ES",
      siteName: siteConfig.name,
      title: post.title,
      description: post.description,
      url: post.permalink,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      tags: post.tags,
      images: post.cover
        ? [{ url: post.cover.src, width: post.cover.width, height: post.cover.height, alt: post.coverAlt ?? post.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: post.cover ? [post.cover.src] : undefined,
    },
  };
}
