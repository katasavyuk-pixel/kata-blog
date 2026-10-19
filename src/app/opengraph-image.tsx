import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { ogCard } from "@/lib/og-card";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogCard({ title: siteConfig.tagline, band: `Para ${siteConfig.audience}.` }),
    size,
  );
}
