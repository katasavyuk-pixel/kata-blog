import Image from "next/image";
import type { Post } from "@/lib/posts";
import { cn } from "@/lib/utils";

/**
 * A post's documentary cover, cropped 16:9. Cards use it above the title; the
 * article page uses it as a wide header image AFTER the h1 and the dek (never
 * before the h1). News editions never get one: a system publishes them and
 * they stay text-only.
 *
 * The alt text is the post's own `coverAlt` (velite requires it whenever a
 * cover exists). On a card the title right below links to the same place, so
 * the image is not wrapped in a second link.
 */
export function Cover({
  post,
  sizes,
  eager = false,
  className,
}: {
  post: Post;
  sizes: string;
  /** Above the fold (the article header): load it now. */
  eager?: boolean;
  className?: string;
}) {
  if (!post.cover || post.formato === "radar") return null;
  return (
    <div className={cn("relative aspect-video overflow-hidden bg-surface", className)}>
      <Image
        src={post.cover.src}
        alt={post.coverAlt ?? ""}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        className="object-cover"
      />
    </div>
  );
}
