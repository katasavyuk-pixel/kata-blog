import { urlDePublicacion, type PublicacionLinkedIn } from "@/config/linkedin";
import { formatDateShort } from "@/lib/format";

/**
 * One LinkedIn post as a card in the site's style: date, the first lines in
 * his words, and the way to the whole post on LinkedIn. A plain link, not the
 * LinkedIn embed (config/linkedin.ts says why).
 */
export function TarjetaLinkedIn({ publicacion }: { publicacion: PublicacionLinkedIn }) {
  return (
    <a
      href={urlDePublicacion(publicacion)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col border border-border bg-panel p-5 font-sans transition-colors hover:border-chrome"
    >
      <span className="text-[0.8125rem] text-muted">
        <span className="font-semibold text-fg">LinkedIn</span> ·{" "}
        <time dateTime={publicacion.fecha}>{formatDateShort(publicacion.fecha)}</time>
      </span>
      <span className="mt-3 line-clamp-5 flex-1 font-display text-[1.0625rem] leading-relaxed text-fg">
        {publicacion.extracto}
      </span>
      <span className="mt-4 text-[0.9375rem] font-semibold text-accent-ink underline underline-offset-[0.18em] group-hover:decoration-2">
        Leer en LinkedIn<span className="sr-only"> (se abre en otra pestaña)</span>
      </span>
    </a>
  );
}
