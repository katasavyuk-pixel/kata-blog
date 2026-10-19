import type { Metadata } from "next";
import { JsonLd } from "@/components/ui/json-ld";
import { coleccionJsonLd, datosDe } from "@/lib/jsonld";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CourseList, type CourseItem } from "@/components/course/course-list";
import { COURSE_SLUGS } from "@/config/course";
import { getPost } from "@/lib/posts";
import { feedAlternates, withOpenGraph } from "@/config/site";

export const metadata: Metadata = withOpenGraph("/empieza-aqui", {
  title: "Empieza aquí — curso interactivo de IA",
  description:
    "El itinerario gratuito para entender la IA de verdad: lecciones interactivas en orden, de los tokens a medir un sistema. Tu progreso se guarda solo.",
  alternates: { ...feedAlternates, canonical: "/empieza-aqui" },
});

export default function EmpiezaAquiPage() {
  // Course = the interactive posts in pedagogical order; skip any unpublished.
  const items: CourseItem[] = COURSE_SLUGS.flatMap((slug) => {
    const post = getPost(slug);
    if (!post) return [];
    return [
      {
        slug: post.slug,
        title: post.title,
        description: post.dek ?? post.description,
        permalink: post.permalink,
      },
    ];
  });

  return (
    <Container className="py-10 sm:py-14">
      <JsonLd data={coleccionJsonLd({ path: "/empieza-aqui", ...datosDe(metadata), items: items.map((p) => ({ name: p.title, url: p.permalink })) })} />
      <header className="max-w-[52ch]">
        <p className="font-sans text-[0.8125rem] font-semibold text-fg">El pilar de la biblioteca · gratis · a tu ritmo</p>
        <h1 className="mt-3 text-h1">Empieza aquí: entiende la IA tocándola</h1>
        <p className="mt-4 text-muted">
          {COURSE_SLUGS.length} lecciones interactivas en el orden que tiene
          sentido: primero qué es un token, al final cómo medir un sistema.
          Cada lección se manipula, no solo se lee. Tu progreso se guarda en
          este navegador — sin cuentas, sin registro.
        </p>
      </header>

      <div className="mt-10 max-w-3xl">
        <CourseList items={items} />
      </div>

      <section aria-labelledby="curso-newsletter" className="mt-12 max-w-3xl border-t border-border pt-6 font-sans">
        <h2 id="curso-newsletter" className="text-h2">
          ¿Terminaste el itinerario?
        </h2>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted">
          La newsletter sigue donde acaba el curso: cada sistema nuevo de la
          biblioteca, contado para que lo repliques — sin ruido.
        </p>
        <div className="mt-5">
          <Button href="/#newsletter">Suscríbete gratis</Button>
        </div>
      </section>
    </Container>
  );
}
