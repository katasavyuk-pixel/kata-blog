import { NewsletterEmail } from "@/emails/newsletter";
import {
  Bloque,
  BotonDeEdicion,
  Construido,
  Cuerpo,
  EnUnMinuto,
  LoImportante,
  Pregunta,
  Secuencia,
  SkillParaUsar,
} from "@/emails/bloques";
import { enlaceDeCorreo, gifDeSecuencia, imagenDeCorreo, type FormatoDeCorreo } from "@/lib/correo";
import {
  cabeceraDeEdicion,
  esVisual,
  etiquetaDeConstruido,
  partesDeEdicion,
  proyectoDe,
  rotuloDeImportante,
  skillDeEdicion,
  type Edicion,
} from "@/lib/edicion";

/**
 * A newsletter edition as an email. The order is the same for both formats,
 * and a block only shows when the edition has it:
 *
 *   photo · title · «En un minuto» · sequence · greeting (body up to its first
 *   ###) · the important thing of the week · what I built · the rest of the
 *   body · button · the skill · the rest of the week's news · the question
 *
 * N1 fills the first half, N2 the second; an old edition is just its body,
 * with the standard closing it always had.
 */
export function EdicionEmail({
  edicion,
  brand,
  preview,
  siteUrl,
  unsubscribeUrl,
}: {
  edicion: Edicion;
  brand: string;
  preview: string;
  siteUrl: string;
  unsubscribeUrl: string;
}) {
  const enlace = (url: string) => enlaceDeCorreo(url, siteUrl, edicion.issue);
  const imagen = (src: string, formato: FormatoDeCorreo) => `${siteUrl}${imagenDeCorreo(src, formato)}`;
  const { entrada, importante, secciones, noticias } = partesDeEdicion(edicion);
  const skill = edicion.skill ? skillDeEdicion(edicion.skill) : undefined;

  return (
    <NewsletterEmail
      brand={brand}
      preview={preview}
      title={edicion.title}
      cabecera={cabeceraDeEdicion(edicion)}
      imagen={edicion.imagen && { src: imagen(edicion.imagen.src, "cabecera"), alt: edicion.imagen.alt }}
      unsubscribeUrl={unsubscribeUrl}
      siteUrl={siteUrl}
      showClosing={!esVisual(edicion)}
    >
      {edicion.minuto?.length ? <EnUnMinuto puntos={edicion.minuto} /> : null}
      {edicion.secuencia ? (
        <Secuencia src={`${siteUrl}${gifDeSecuencia(edicion.issue)}`} titulo={edicion.secuencia.titulo} alt={edicion.secuencia.alt} />
      ) : null}
      {entrada ? <Cuerpo html={entrada} /> : null}
      {edicion.importante || importante ? (
        <LoImportante
          titulo={edicion.importante?.titulo}
          html={importante}
          href={edicion.importante?.url && enlace(edicion.importante.url)}
          rotulo={rotuloDeImportante(edicion.importante ?? {})}
          imagen={edicion.importante?.imagen && { src: imagen(edicion.importante.imagen.src, "ancha"), alt: edicion.importante.imagen.alt }}
        />
      ) : null}
      {edicion.construido?.length ? (
        <Construido
          items={edicion.construido.map((item) => ({
            titulo: item.titulo,
            href: enlace(item.url),
            frase: item.frase,
            etiqueta: etiquetaDeConstruido(item),
            imagen: item.imagen && imagen(item.imagen.src, "tarjeta"),
            proyecto: proyectoDe(item.proyecto),
          }))}
        />
      ) : null}
      {secciones.map((seccion) => (
        <Bloque key={seccion.titulo} titulo={<span dangerouslySetInnerHTML={{ __html: seccion.titulo }} />}>
          <Cuerpo html={seccion.html} alto={10} />
        </Bloque>
      ))}
      {edicion.boton ? <BotonDeEdicion href={enlace(edicion.boton.url)} texto={edicion.boton.texto} /> : null}
      {skill ? (
        <SkillParaUsar
          titulo={skill.titulo}
          texto={skill.texto}
          href={enlace(skill.href)}
          color={skill.color}
          foto={skill.foto && imagen(skill.foto, "skill")}
        />
      ) : null}
      {noticias ? (
        <Bloque titulo={<span dangerouslySetInnerHTML={{ __html: noticias.titulo }} />}>
          <Cuerpo html={noticias.html} alto={10} />
        </Bloque>
      ) : null}
      {edicion.pregunta ? <Pregunta texto={edicion.pregunta} /> : null}
    </NewsletterEmail>
  );
}
