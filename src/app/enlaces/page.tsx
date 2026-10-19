import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { siteConfig } from "@/config/site";
import { getLatestYouTubeVideo } from "@/lib/youtube";

/** Refresh the featured upload without requiring a redeploy after publishing. */
export const revalidate = 900;

export const metadata: Metadata = {
  title: "Enlaces",
  description:
    "Vídeos, sistemas de IA, recursos y formas de trabajar con Kata Ivanovych y NBI.",
  robots: { index: false, follow: false },
};

const BIO_UTM =
  "utm_source=bio&utm_medium=profile&utm_campaign=link-hub";

/** Keep the fragment after the query string so newsletter anchors still work. */
function bioHref(href: string) {
  const [path, fragment] = href.split("#");
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${BIO_UTM}${fragment ? `#${fragment}` : ""}`;
}

type BioLinkItem = {
  label: string;
  description: string;
  href: string;
};

const links: BioLinkItem[] = [
  {
    label: "Calcula el coste de tu proceso",
    description: "Pon tus números y estima el ahorro antes de decidir.",
    href: bioHref("https://ianexora.com/"),
  },
  {
    label: "Suscríbete a la newsletter",
    description: "Lo importante de la semana: sistemas en marcha, sus números y qué se rompió. Como mucho, uno a la semana.",
    href: bioHref("/newsletter#suscribirse"),
  },
  {
    label: "Ver los sistemas que ya funcionan",
    description: "Lo que he construido en NBI y cómo puedes replicarlo.",
    href: bioHref("/sistemas"),
  },
  {
    label: "Empieza el curso gratuito de IA",
    description: "Aprende manipulando modelos, sin cuenta y sin pago.",
    href: bioHref("/empieza-aqui"),
  },
  {
    label: "Automatiza un proceso con NBI",
    description: "Cuéntame qué tarea te está comiendo horas.",
    href: bioHref("https://ianexora.com/servicios/diagnostico-de-procesos"),
  },
];

const socialPresentation: Record<string, { description: string }> = {
  LinkedIn: {
    description: "Ideas, aprendizajes y conversaciones sobre IA.",
  },
  X: {
    description: "Notas breves mientras construyo NBI.",
  },
  GitHub: {
    description: "Código y proyectos que puedes explorar.",
  },
  Instagram: {
    description: "El día a día de construir NBI.",
  },
};

function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

/** One row of the hub: label and one line, a chevron, a hairline under it. */
function BioLink({ label, description, href }: BioLinkItem) {
  const className =
    "group flex min-h-16 items-center gap-4 border-b border-border py-3.5 transition-colors";
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[1rem] font-semibold text-fg transition-colors group-hover:text-accent-ink">
          {label}
        </span>
        <span className="mt-0.5 block text-[0.9375rem] leading-snug text-muted">
          {description}
        </span>
      </span>
      <Icon
        name="chevron-right"
        className="text-faint transition-colors group-hover:text-accent-ink"
      />
    </>
  );

  return isExternal(href) ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export default async function EnlacesPage() {
  const latestVideo = await getLatestYouTubeVideo();
  const latestVideoHref = bioHref(latestVideo.href);
  const socialLinks = [
    {
      label: "YouTube",
      description: "Vídeos sobre sistemas, IA y negocio real.",
      href: latestVideoHref,
    },
    // YouTube leads with the latest video above; the channel link is the same place.
    ...siteConfig.social.filter((social) => social.label !== "YouTube").map((social) => ({
      ...socialPresentation[social.label],
      label: social.label,
      href: bioHref(social.href),
    })),
  ];

  return (
    <main className="min-h-[100svh] bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-5 py-10 font-sans sm:px-8 sm:py-14">
        <header className="max-w-[66ch]">
          <h1 className="text-h1">
            <Link href="/" className="hover:text-accent-ink">
              {siteConfig.name}
            </Link>
          </h1>
          <p className="mt-3 font-body text-muted">
            Construyo sistemas de IA para negocios y cuento qué cuesta
            montarlos.
          </p>
        </header>

        <section className="mt-9" aria-labelledby="ultimo-video">
          <a
            href={latestVideoHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group grid gap-4 border-t border-border pt-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-6"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-border bg-surface">
              <Image
                src={latestVideo.image}
                alt=""
                fill
                priority
                sizes="(max-width: 640px) calc(100vw - 2.5rem), 480px"
                className="object-cover"
              />
              <span
                aria-hidden
                className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-lg text-on-accent transition-colors group-hover:bg-accent-strong"
              >
                <Icon name="play" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-sans text-[0.8125rem] font-semibold text-fg">
                {latestVideo.label}
              </p>
              <h2
                id="ultimo-video"
                className="mt-2 text-h2 transition-colors group-hover:text-accent-ink"
              >
                {latestVideo.title}
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
                {latestVideo.description}
              </p>
            </div>
          </a>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="enlaces-principales">
            <h2 id="enlaces-principales" className="text-h3">
              Lo que puedes hacer
            </h2>
            <div className="mt-3 flex flex-col border-t border-border">
              {links.map((link) => (
                <BioLink key={link.href} {...link} />
              ))}
            </div>
          </section>

          <section aria-labelledby="perfiles-y-canales">
            <h2 id="perfiles-y-canales" className="text-h3">
              Perfiles y canales
            </h2>
            <div className="mt-3 flex flex-col border-t border-border">
              {socialLinks.map((social) => (
                <BioLink key={social.label} {...social} />
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-10">
          <Link
            href="/"
            className="font-sans text-[0.8125rem] text-muted transition-colors hover:text-fg"
          >
            kata.ianexora.com
          </Link>
        </footer>
      </div>
    </main>
  );
}
