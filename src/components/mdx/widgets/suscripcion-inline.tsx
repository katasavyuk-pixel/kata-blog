import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import type { CtaInline } from "@/config/cta-inline";

/**
 * Subscription ask placed inside the article body.
 *
 * In the body on purpose, not in the sticky rail and not only at the foot: a
 * reader who is halfway through and finding it useful is the one most likely to
 * want the next one. Before this, six of the nine published articles — every
 * lesson — had no email field anywhere on the page, including the one hosting the
 * cost calculator.
 *
 * The copy comes from the post's frontmatter, resolved in page.tsx (the MDX body
 * cannot see its own frontmatter, so the component is bound to the post where
 * the components map is built). One typed field, like everywhere else.
 *
 * When the post declares a `recurso`, this form *is* the delivery. Before that,
 * an article with a downloadable attached asked twice: a subscribe box in the
 * body and a link out to /recursos, which is the same signup into the same
 * list — so it read as being asked for an address over and over. `signup_path`
 * still separates the two places, so nothing is lost by merging the ask.
 *
 * `not-prose` because it sits inside Prose and should not inherit article
 * typography.
 */
export function SuscripcionInline({
  gancho,
  promesa,
  recurso,
}: CtaInline & { recurso?: string }) {
  return (
    <aside id="suscripcion" className="not-prose my-10 scroll-mt-24 border border-border bg-surface p-6 sm:p-7">
      <p className="font-display text-lg font-semibold text-fg">{gancho}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{promesa}</p>
      <div className="mt-4">
        <SubscribeForm
          source="post-inline"
          resource={recurso}
          {...(recurso
            ? {
                submitLabel: "Enviármelo",
                doneMessage:
                  "Hecho. Confirma en tu correo y te llega la descarga en el mismo email.",
              }
            : {})}
        />
      </div>
    </aside>
  );
}
