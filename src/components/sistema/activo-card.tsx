import Link from "next/link";
import { Estado } from "@/components/sistema/estado";
import type { ActivoResuelto } from "@/lib/catalogo";

const linkClass =
  "text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current";

/**
 * An installable asset in a listing: what it does, its status, and the way to
 * its spec sheet. The listing never prints an install command per card — the
 * set installs as one package, and the page of each asset is where a reader
 * finds out what it reads and writes before installing anything.
 */
export function ActivoCard({ item, heading = "h3" }: { item: ActivoResuelto; heading?: "h2" | "h3" }) {
  const Heading = heading;
  return (
    <article className="border-t border-border pt-5 font-sans">
      <Estado evidencia={item.evidencia} variant="pill" />
      <Heading className="mt-3 font-display text-[1.375rem] font-semibold leading-tight text-fg">
        <Link href={item.href} className="hover:text-accent-ink">
          {item.title}
        </Link>
      </Heading>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{item.queHace}</p>
      <p className="mt-3 text-[0.9375rem]">
        <Link href={item.href} className={linkClass}>
          Ver la ficha: qué lee, qué escribe y cómo se instala
        </Link>
      </p>
    </article>
  );
}
