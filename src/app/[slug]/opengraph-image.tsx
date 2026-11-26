import { ImageResponse } from "next/og";
import { getPost } from "@/lib/posts";
import { siteConfig } from "@/config/site";
import { ogCard } from "@/lib/og-card";

export const alt = "Artículo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  return new ImageResponse(
    ogCard({ title: post?.title ?? siteConfig.name, band: siteConfig.tagline }),
    size,
  );
}
