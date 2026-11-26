import * as runtime from "react/jsx-runtime";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ComponentType } from "react";
import { conBase, rutaInterna } from "@/config/base-path";

/** Default element overrides shared by every MDX document. */
const sharedComponents = {
  a: ({ href: original = "", ...props }: ComponentPropsWithoutRef<"a">) => {
    // Content written for kata.ianexora.com links "/blog/<slug>" and
    // "/sobre-mi": mapped to this zone's routes so there is no redirect hop.
    const href = rutaInterna(original);
    if (href.startsWith("/")) return <Link href={href} {...props} />;
    if (href.startsWith("#")) return <a href={href} {...props} />;
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props} />;
  },
  // Images in the content live in public/: they need the /blog prefix.
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  img: ({ src, ...props }: ComponentPropsWithoutRef<"img">) => <img src={typeof src === "string" ? conBase(src) : src} {...props} />,
  // A table wider than the column scrolls inside its own box instead of being
  // cut off at the edge of a phone: four columns do not fit in 335px. The box
  // is focusable so the scroll is reachable from the keyboard.
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="overflow-x-auto" tabIndex={0} role="group">
      <table {...props} />
    </div>
  ),
};

function getMDXComponent(
  code: string,
): ComponentType<{ components?: Record<string, unknown> }> {
  // Velite compiles MDX to a function body that reads the JSX runtime from arguments[0].
  const fn = new Function(code);
  return fn({ ...runtime }).default;
}

export function MDXContent({
  code,
  components,
}: {
  code: string;
  components?: Record<string, unknown>;
}) {
  const Component = getMDXComponent(code);
  // MDX content is compiled to a component at runtime by design (content, not UI state).
  // eslint-disable-next-line react-hooks/static-components
  return <Component components={{ ...sharedComponents, ...components }} />;
}
