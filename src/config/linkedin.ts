/**
 * Kata's LinkedIn posts shown on the site (2026-10-15: «publicaciones de
 * LinkedIn, sí, pero que no sea con vídeo vertical»). Extended on 2026-11-23
 * with posts from 2026-10-17 to 2026-11-23, taken from Buffer's record of his
 * profile. Extended again on 2026-11-27 with posts from 2026-11-24 to
 * 2026-11-26, also from Buffer's record of his profile. Shown as cards in
 * the site's own style, never the LinkedIn iframe:
 * the embed sets LinkedIn's cookies before anyone clicks, and it cannot take
 * the brand's type or colour.
 *
 * `extracto` is his own words, shortened, without emoji. What is left out on
 * purpose (tests/linkedin.test.ts keeps it out):
 * - the vertical video of 4 Sept;
 * - the 2026-10-20 post (company plural «leemos» and it names the town, which
 *   the blog never does);
 * - posts in the plural of a company («en NBI observamos», «estamos
 *   construyendo», «tenemos una solución», «dirijo una empresa»):
 *   the site's voice is first person singular on every surface.
 *
 * The video posts kept (23 Oct, 6 Nov, 10 Nov at 4:5, 29 Oct at 16:9) are not
 * vertical 9:16 like the 4 Sept one. LinkedIn post ids carry their date
 * (milliseconds in the bits above the 22nd): the test checks `fecha` against it.
 */
export type PublicacionLinkedIn = {
  /** The number in urn:li:<type>:<id>. A string: it does not fit in a JS number. */
  id: string;
  /** LinkedIn post URLs accept these URN types; Buffer and the post's own link give share/ugcPost ids, all carrying the date the same way (ms above bit 22). */
  urn?: "activity" | "share" | "ugcPost";
  fecha: string;
  extracto: string;
};

export const PUBLICACIONES_LINKEDIN: readonly PublicacionLinkedIn[] = [
  {
    urn: "share",
    id: "7531635500596776961",
    fecha: "2026-11-26",
    extracto:
      "Casi siempre que alguien me pregunta «¿qué IA uso?», la respuesta útil es otra pregunta: ¿qué proceso quieres arreglar? El error que más veo es empezar por la herramienta. Mi opinión: la primera automatización no tiene que ser la más espectacular. Tiene que ser la que puedas describir sin ambigüedad, medir unas semanas y corregir si falla.",
  },
  {
    urn: "share",
    id: "7531393983353245697",
    fecha: "2026-11-25",
    extracto:
      "¿ChatGPT nombra tu negocio cuando alguien le pide una recomendación? Casi nadie lo mira. Y si lo miras una vez, al mes siguiente ya no te acuerdas de qué preguntaste. Por eso he preparado una skill gratuita para medirlo cada mes. Ojo: una respuesta suelta no dice nada. Lo que cuenta es la tendencia.",
  },
  {
    urn: "share",
    id: "7531273057097777153",
    fecha: "2026-11-25",
    extracto:
      "Cuando alguien me dice «la IA ya me lo hace bien», siempre hago la misma pregunta: ¿con qué umbral? Montar una automatización con IA es fácil. Lo difícil es responder con datos a la pregunta incómoda: ¿funciona de verdad? Mi opinión: sin ese número no hay sistema, hay una corazonada.",
  },
  {
    urn: "share",
    id: "7530910748298887168",
    fecha: "2026-11-24",
    extracto:
      "Tu equipo ya usa IA para trabajar. La pregunta es con qué datos. Haz la prueba: pregunta quién usa ChatGPT, Claude o Gemini en el trabajo. Sin juzgar. Lo normal es que alguien resuma correos de clientes con su cuenta personal… y que nadie haya decidido si eso se puede. Mi opinión: prohibirlo no sirve.",
  },
  {
    urn: "share",
    id: "7530548389550202882",
    fecha: "2026-11-23",
    extracto:
      "¿Sabes cuántos programas pueden entrar en tu correo sin escribir tu contraseña? Yo tampoco lo sabía hasta que me puse a mirarlo. Mi opinión: el problema no es la contraseña. Es ese permiso que diste una vez a un proveedor o a una aplicación y que sigue ahí meses después.",
  },
  {
    urn: "share",
    id: "7529461143132725250",
    fecha: "2026-11-20",
    extracto:
      "Doce reseñas de Google sin contestar y un viernes que nunca llega. Cómo usaría yo la IA para esto: no para soltar «¡Gracias por tu reseña!» doce veces, sino para preparar un borrador distinto para cada reseña y dejarte a ti lo delicado.",
  },
  {
    urn: "ugcPost",
    id: "7529098755049119744",
    fecha: "2026-11-19",
    extracto:
      "Tu programa de gestión no crea datos. Los recibe. Quien los crea es una persona que abre un correo, lee un pedido escrito en prosa y lo teclea en una pantalla. El inbox ya es un sistema. Solo que no tiene dueño, no está documentado y nadie lo mide.",
  },
  {
    urn: "ugcPost",
    id: "7528800604840808448",
    fecha: "2026-11-18",
    extracto:
      "La primera automatización de una empresa casi nunca debería ser la más espectacular. Debería ser la que puedas describir sin ambigüedad, medir durante unas semanas y corregir si algo sale mal.",
  },
  {
    urn: "ugcPost",
    id: "7525881525452574720",
    fecha: "2026-11-10",
    extracto:
      "El 74 % de las grandes empresas en España ya usa IA. ¿Y las micropymes? Solo el 21 %. Mi lectura: el problema no es la tecnología, es que nadie se la ha explicado a la pyme con su idioma y sus números.",
  },
  {
    urn: "ugcPost",
    id: "7524437647688208384",
    fecha: "2026-11-06",
    extracto:
      "Ayer Wall Street se dejó 3,2 billones de dólares en un solo día. La IA no se va a parar… pero sí se acaba la fase de «invertir sin mirar». Las empresas que ganan ahora no son las que compran humo, sino las que usan la IA en procesos reales.",
  },
  {
    urn: "ugcPost",
    id: "7521575065281527808",
    fecha: "2026-10-29",
    extracto:
      "Amazon ha advertido a sus ingenieros sobre convertir el consumo de IA en un objetivo. Usar más no significa necesariamente trabajar mejor. Yo miraría tres cosas: el tiempo total, incluida la revisión; el coste; y la calidad del resultado.",
  },
  {
    urn: "share",
    id: "7520397850464256000",
    fecha: "2026-10-26",
    extracto:
      "Un economista de Apollo dice que la IA ha dado «cero retorno financiero» a las grandes empresas de EE. UU. fuera de la tecnología. Yo no sé si acierta. Lo que sí sé es que, sin medir antes y después, nadie puede saberlo de tu negocio.",
  },
  {
    urn: "ugcPost",
    id: "7519396660758691840",
    fecha: "2026-10-23",
    extracto:
      "Un grupo comprometió la app de copias de seguridad de ConnectWise. Con su llave probó el acceso a más de 2.250 cuentas. Ojo con la cifra: son intentos, no empresas hackeadas. No usaron la contraseña de nadie. Usaron la llave de la aplicación.",
  },
  {
    urn: "share",
    id: "7518955252931371008",
    fecha: "2026-10-22",
    extracto:
      "Walmart deja que un agente de IA compre por ti. Amazon lo bloquea. Si el agente de tu cliente llega a tu tienda, ¿puede leer tu catálogo, tus precios y tu stock? Yo no sé cuál de las dos apuestas gana. Lo que sí sé es que no decidir también es una decisión.",
  },
  {
    urn: "share",
    id: "7517177837162758144",
    fecha: "2026-10-17",
    extracto:
      "El CEO de Replit dice que su empresa es ahora «autónoma». Lo interesante no es la etiqueta. Es el reparto. La máquina prepara. La persona decide. Un agente sin alguien que revise lo que propone no es una empresa autónoma. Es un lío más rápido.",
  },
  {
    id: "7516523663756566531",
    fecha: "2026-10-15",
    extracto:
      "Me dio un poco de vértigo abrir el registro de mi propio agente de IA. Entre el 5 de septiembre y el 13 de octubre: 40 ejecuciones, 29 fallidas. Y aquí viene la parte incómoda: las horas que dediqué a reparar fallos no las medí.",
  },
  {
    id: "7512854162896945152",
    fecha: "2026-10-05",
    extracto:
      "Antes de meter IA… ¿puedes dibujar el proceso en una hoja? Si no, aún no toca automatizar. Dónde se atasca de verdad, por qué un agente sin dueño solo mueve el lío y el filtro en tres pasos: mapa, decide, construye.",
  },
  {
    id: "7508539462923063296",
    fecha: "2026-09-23",
    extracto:
      "¿Tu empresa tendrá que dejar el papel en 2027 por eFTI? No. Desde el 9 de julio de 2027, las autoridades de la UE deberán aceptar información regulatoria de transporte mediante plataformas eFTI certificadas. Para las empresas, adoptar eFTI sigue siendo voluntario por ahora.",
  },
  {
    id: "7500663386146267136",
    fecha: "2026-09-01",
    extracto:
      "El hype de la IA está vendiendo herramientas. Las empresas están comprando esperanza. La IA no falla porque sea débil. Falla porque se usa para tapar un proceso que nadie midió.",
  },
  {
    id: "7498752940233359360",
    fecha: "2026-08-27",
    extracto:
      "No quería presentar MaitreAI como algo que todavía no es. Lo construí para atender reservas de restaurantes por WhatsApp y voz. Le pregunté a una IA qué agente recomendaría para gestionar reservas en un restaurante. MaitreAI no apareció.",
  },
  {
    id: "7496313205145845762",
    fecha: "2026-08-20",
    extracto:
      "Antes de automatizar, diagnostica. El primer paso es identificar qué está afectando realmente al negocio: el tiempo, los datos o el margen. Después, observa, prioriza y automatiza.",
  },
];

export function urlDePublicacion(publicacion: Pick<PublicacionLinkedIn, "id" | "urn">): string {
  return `https://www.linkedin.com/feed/update/urn:li:${publicacion.urn ?? "activity"}:${publicacion.id}/`;
}
