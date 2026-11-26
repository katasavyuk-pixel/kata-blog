import NextImage, { type ImageProps } from "next/image";
import { conBase } from "@/config/base-path";

/**
 * `next/image` with the /blog base path on local sources.
 *
 * Next prefixes the optimizer route (/blog/_next/image) but not the `src` it
 * is asked to fetch: "/covers/x.webp" would be read from ianexora.com/covers,
 * which is NBI-WEB's. Every image of the site goes through this component so
 * the prefix is added in one place (src/config/base-path.ts).
 */
export default function Image({ src, ...props }: ImageProps) {
  return <NextImage src={typeof src === "string" ? conBase(src) : src} {...props} />;
}
