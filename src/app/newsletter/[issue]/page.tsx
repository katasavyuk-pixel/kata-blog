import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { EdicionWeb } from "@/components/newsletter/bloques";
import { ShareButtons } from "@/components/blog/share-buttons";
import { JsonLd } from "@/components/ui/json-ld";
import { articleJsonLd, breadcrumbJsonLd, personJsonLd } from "@/lib/jsonld";
import { sentIssues, getIssue } from "@/lib/newsletter-archive";
import { feedAlternates, siteConfig, withOpenGraph } from "@/config/site";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return sentIssues.map((issue) => ({ issue: issue.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ issue: string }>;
}): Promise<Metadata> {
  const { issue: slug } = await params;
  const issue = getIssue(slug);
  if (!issue) return {};
  return withOpenGraph(
    issue.permalink,
    {
      title: issue.title,
      description: issue.descripcion ?? issue.preheader,
      alternates: { ...feedAlternates, canonical: issue.permalink },
    },
    { ogExtra: { type: "article", publishedTime: issue.date } },
  );
}

/**
 * One sent edition, on the open web.
 *
 * The HTML is the compiled markdown the subscribers received — same source,
 * one file, no second version to keep in sync. Two consequences worth knowing:
 *
 * - Links inside carry the email's UTM tags and the production domain. The
 *   domain part is the known "dominio a fuego" debt (see ESTADO.md); the UTMs
 *   are left as-is on purpose, so web reads of an edition are distinguishable
 *   from actual email clicks in whatever reads those tags.
 * - The body renders through `Prose` with dangerouslySetInnerHTML. That is the
 *   same trust level as an MDX post — the content is versioned in this repo —
 *   and the same mechanism the email send itself uses.
 * - The visual blocks (photo, «En un minuto», the sequence, what I built, the
 *   news, the skill, the question) render as on the email, in the same order.
 */
export default async function NewsletterIssuePage({
  params,
}: {
  params: Promise<{ issue: string }>;
}) {
  const { issue: slug } = await params;
  const issue = getIssue(slug);
  if (!issue) notFound();

  const fullUrl = `${siteConfig.url}${issue.permalink}`;

  return (
    <Container className="py-10 sm:py-14">
      <JsonLd
        data={[
          // "nota" → plain Article: honest for an emailed edition on the web.
          articleJsonLd({
            title: issue.title,
            description: issue.preheader,
            date: issue.date,
            formato: "nota",
            tags: [],
            permalink: issue.permalink,
            metadata: {},
          }),
          // The article points at the author by @id: the node goes on the page too.
          personJsonLd(),
          breadcrumbJsonLd([
            { name: "Newsletter", path: "/newsletter" },
            { name: issue.title, path: issue.permalink },
          ]),
        ]}
      />

      <div className="mx-auto max-w-[66ch]">
        <header>
          <p className="font-sans text-[0.8125rem] font-semibold text-fg">
            <Link href="/newsletter" className="hover:text-accent-ink">
              Edición de la newsletter
            </Link>
          </p>
          <h1 className="mt-3 text-h1">{issue.title}</h1>
          <p className="mt-4 text-muted">{issue.preheader}</p>
          <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-4 font-sans text-[0.8125rem] text-muted">
            <span className="text-chrome">{siteConfig.author.name}</span>
            <span aria-hidden>·</span>
            <time dateTime={issue.date}>{formatDate(issue.date)}</time>
          </p>
        </header>

        {/* The edition block by block, as the email has it (src/emails/edicion.tsx):
            the body HTML is trusted for the reasons in the comment above. */}
        <EdicionWeb edicion={issue} />

        <section
          aria-labelledby="edicion-siguiente"
          className="mt-12 border-t border-border pt-6 font-sans"
        >
          <h2 id="edicion-siguiente" className="text-h2">
            Lo próximo, en tu buzón
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            Esta edición ya se envió. La siguiente llega primero a los
            suscriptores —{" "}
            <Link
              href="/newsletter#suscribirse"
              className="text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
            >
              apúntate en el archivo
            </Link>
            .
          </p>
          <div className="mt-6">
            <ShareButtons url={fullUrl} title={issue.title} />
          </div>
        </section>
      </div>
    </Container>
  );
}
