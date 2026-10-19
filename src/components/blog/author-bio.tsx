import Link from "next/link";
import { siteConfig } from "@/config/site";
import { COMO_SE_HACE_HREF, FIRMA_AUTOMATICA } from "@/config/noticias";

/**
 * Author block at the foot of every article.
 *
 * Reuses `siteConfig.author.bio` — the credential already exists in one place and
 * this is not the file to write a second version of it.
 *
 * Doubles as an authorship signal: a named author with a concrete credential next
 * to the article body is one of the few things that reliably distinguishes a page
 * written by someone from a page assembled by nobody.
 */
export function AuthorBio() {
  return (
    <aside className="not-prose mt-14 border-t border-border pt-6 font-sans">
      <p className="font-sans text-[0.8125rem] text-muted">Quién escribe esto</p>
      <p className="mt-2 text-base font-semibold text-fg">{siteConfig.author.name}</p>
      <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted">
        {siteConfig.author.bio}
      </p>
      <Link
        href="/sobre-mi"
        className="mt-3 inline-block text-[0.9375rem] text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
      >
        Más sobre mí
      </Link>
    </aside>
  );
}

/**
 * The same slot on an automated news piece. "Quién escribe esto" with the
 * author's name under a text no person wrote was a false byline; this says what
 * produced it and where the method is. The AI label itself is at the top
 * and in the source box; here it would be a third time. Once Kata has
 * reviewed the piece, it says so.
 */
export function OrigenAutomatico({ revisado }: { revisado: boolean }) {
  return (
    <aside className="not-prose mt-14 border-t border-border pt-6 font-sans">
      <p className="font-sans text-[0.8125rem] text-muted">Cómo se hizo esto</p>
      <p className="mt-2 text-base font-semibold text-fg">{FIRMA_AUTOMATICA}</p>
      <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted">
        Un sistema lee las fuentes, redacta el texto y comprueba cada enlace y cada titular contra
        lo recolectado antes de publicar.{revisado ? " Después lo he leído y revisado yo." : null} Si
        ves un error, escríbeme a{" "}
        <a href={`mailto:${siteConfig.replyEmail}`} className="text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current">
          {siteConfig.replyEmail}
        </a>{" "}
        y lo corrijo.
      </p>
      <Link
        href={COMO_SE_HACE_HREF}
        className="mt-3 inline-block text-[0.9375rem] text-accent-ink underline decoration-accent-ink/45 underline-offset-[0.18em] hover:decoration-current"
      >
        Cómo se hacen las noticias
      </Link>
    </aside>
  );
}
