import { TagPill } from "@/components/content/tag-pill";
import { tagHref } from "@/config/taxonomy";

/** Secondary keyword filter. Primary navigation is tema/formato, not tags. */
export function TagList({
  tags,
  active,
}: {
  tags: { tag: string; count: number }[];
  active?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ tag, count }) => (
        <TagPill
          key={tag}
          tag={tag}
          count={count}
          href={tagHref(tag)}
          active={active === tag}
        />
      ))}
    </div>
  );
}
