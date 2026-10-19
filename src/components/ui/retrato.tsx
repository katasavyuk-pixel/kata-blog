import Image from "next/image";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * The author's portrait (public/kata), from a real photo. Two crops of the same
 * shot: the head-and-shoulders one for large sizes, and a square face crop for
 * anything under ~120px, where the full crop leaves the face a few pixels wide.
 * One source so the hero, the article byline and /sobre-mi never disagree on
 * the file, its size or its alt text.
 */
export const RETRATO = {
  src: "/kata/retrato.webp",
  width: 632,
  height: 808,
  alt: siteConfig.author.name,
} as const;

export const RETRATO_CARA = {
  src: "/kata/retrato-cara.webp",
  width: 320,
  height: 320,
  alt: siteConfig.author.name,
} as const;

/** Small portrait for bylines: the square face crop, round or square. */
export function RetratoMini({
  size = 40,
  round = true,
  className,
  decorative = false,
}: {
  size?: number;
  round?: boolean;
  className?: string;
  /** When the name is printed right next to it, the image adds nothing for a screen reader. */
  decorative?: boolean;
}) {
  return (
    <Image
      src={RETRATO_CARA.src}
      width={size}
      height={size}
      alt={decorative ? "" : RETRATO.alt}
      sizes={`${size}px`}
      className={cn(
        "shrink-0 object-cover",
        round ? "rounded-full" : "",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
