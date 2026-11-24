import { cache } from "react";
import { REGALO } from "@/config/regalo";
import { allPosts } from "@/lib/posts";
import { recursosDePosts } from "@/lib/portada-recursos";
import { getPublishedResources, type Resource } from "@/lib/resources";

const recursoDeAlta: Resource = {
  id: REGALO.hoja.slug,
  slug: REGALO.hoja.slug,
  title: REGALO.titulo,
  description: REGALO.resumen,
  requires_email: true,
  download_count: 0,
};

/** Pure priority rule: database, published-content fallback, then signup gift. */
export function seleccionarRegaloSemana(
  recursosPublicados: readonly Resource[],
  recursosDeContenido: readonly Resource[],
  regaloAlta: Resource = recursoDeAlta,
): Resource {
  return recursosPublicados[0] ?? recursosDeContenido[0] ?? regaloAlta;
}

/** Resource list and weekly pick shared by the home and its newsletter forms. */
export const datosRegaloDeLaSemana = cache(async (): Promise<{
  regalo: Resource;
  recursos: Resource[];
}> => {
  const recursosContenido = recursosDePosts(allPosts);
  let recursosPublicados: Resource[] = [];
  try {
    recursosPublicados = await getPublishedResources();
  } catch {
    // Content-derived resources keep static generation usable without Supabase.
  }
  const recursos = recursosPublicados.length > 0 ? recursosPublicados : recursosContenido;
  const regalo = seleccionarRegaloSemana(recursosPublicados, recursosContenido);
  const archivo = recursos.some((recurso) => recurso.slug === REGALO.hoja.slug)
    ? recursos
    : [...recursos, recursoDeAlta];

  return { regalo, recursos: archivo };
});
