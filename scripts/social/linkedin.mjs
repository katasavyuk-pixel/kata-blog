/**
 * Publicar en el perfil personal de Kata en LinkedIn, por la API oficial (Posts API,
 * permiso `w_member_social`, producto «Share on LinkedIn»; 17-oct-2026).
 *
 * Solo se publica lo que Kata aprueba: el workflow `linkedin-publicar.yml` lo
 * lanza al poner él la etiqueta `publicar-linkedin` en una issue. Este módulo no
 * decide nada: da forma al texto, llama a la API y devuelve el enlace.
 *
 * Node puro, sin dependencias: lo importan el script, el workflow y los tests.
 */

/** Versión de la API (YYYYMM). Se puede cambiar con LINKEDIN_VERSION. */
export const VERSION_API = "202609";

/** Máximo de `commentary` que acepta LinkedIn en un post. */
export const MAX_CARACTERES = 3000;

export const MARCA_INICIO = "<!-- post -->";
export const MARCA_FIN = "<!-- /post -->";

/**
 * El texto de un post va en formato «little»: estos caracteres están reservados
 * (menciones, hashtags y plantillas) y, sin una barra delante, LinkedIn corta o
 * deforma el texto sin avisar. Lista de la documentación oficial:
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format
 */
const RESERVADOS = /[\\|{}@[\]()<>#*_~]/g;

export function escaparLittle(texto) {
  return texto.replace(RESERVADOS, (c) => `\\${c}`);
}

/**
 * Del texto que escribe Kata al `commentary` de la API: todo escapado, salvo los
 * `#etiqueta`, que pasan a la plantilla de hashtag para que sean enlaces de verdad.
 */
export function aCommentary(texto) {
  const limpio = texto.replace(/\r\n/g, "\n").trim();
  return limpio
    .split(/(#[\p{L}\p{N}]+)/u)
    .map((trozo) =>
      /^#[\p{L}\p{N}]+$/u.test(trozo) ? `{hashtag|\\#|${escaparLittle(trozo.slice(1))}}` : escaparLittle(trozo),
    )
    .join("");
}

/** El post está entre `<!-- post -->` y `<!-- /post -->`, en el cuerpo de la issue. */
export function extraerPost(cuerpo) {
  const inicio = cuerpo.indexOf(MARCA_INICIO);
  const fin = cuerpo.indexOf(MARCA_FIN);
  if (inicio === -1 || fin === -1 || fin < inicio) {
    throw new Error(`La issue no trae el post entre ${MARCA_INICIO} y ${MARCA_FIN}.`);
  }
  const texto = cuerpo.slice(inicio + MARCA_INICIO.length, fin).trim();
  if (!texto) throw new Error("El post de la issue está vacío.");
  if (texto.length > MAX_CARACTERES) {
    throw new Error(`El post tiene ${texto.length} caracteres y LinkedIn admite ${MAX_CARACTERES}.`);
  }
  return texto;
}

/** Las imágenes viven en el repo, en esta carpeta, y salen en el post con su texto alternativo. */
export const CARPETA_IMAGENES = "docs/social/img/";
const IMAGEN_VALIDA = /^docs\/social\/img\/[\w.-]+\.(jpe?g|png|gif)$/i;
export const MAX_BYTES_IMAGEN = 8 * 1024 * 1024;

/**
 * La imagen del post, si la issue la declara: `<!-- imagen: docs/social/img/x.jpg -->`
 * y `<!-- alt: texto alternativo -->` (obligatorio: accesibilidad). La ruta solo
 * puede apuntar a la carpeta de imágenes del repo, nunca fuera de ella.
 */
export function extraerImagen(cuerpo) {
  const ruta = cuerpo.match(/<!--\s*imagen:\s*(.+?)\s*-->/)?.[1];
  if (!ruta) return null;
  if (!IMAGEN_VALIDA.test(ruta) || ruta.includes("..")) {
    throw new Error(`La imagen tiene que estar en ${CARPETA_IMAGENES} y ser JPG, PNG o GIF (no ${ruta}).`);
  }
  const alt = cuerpo.match(/<!--\s*alt:\s*(.+?)\s*-->/s)?.[1]?.trim();
  if (!alt) throw new Error("La imagen necesita su texto alternativo: <!-- alt: describe la imagen -->.");
  return { ruta, alt };
}

/** @param {{ personaId: string, texto: string, imagenUrn?: string, alt?: string }} datos */
export function cuerpoDePost({ personaId, texto, imagenUrn, alt }) {
  if (!personaId) throw new Error("Falta LINKEDIN_PERSON_ID: hay que autorizar la app (npm run linkedin:autorizar).");
  return {
    author: `urn:li:person:${personaId}`,
    commentary: aCommentary(texto),
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    ...(imagenUrn ? { content: { media: { id: imagenUrn, altText: alt } } } : {}),
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
}

export function urlDePost(id) {
  return `https://www.linkedin.com/feed/update/${id}/`;
}

/** Días hasta que caduca el permiso (null si no se sabe). */
export function diasHastaCaducar(caducaISO, ahora = new Date()) {
  if (!caducaISO) return null;
  const caduca = new Date(caducaISO);
  if (Number.isNaN(caduca.getTime())) return null;
  return Math.floor((caduca.getTime() - ahora.getTime()) / 86_400_000);
}

const cabeceras = (token, version) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "X-Restli-Protocol-Version": "2.0.0",
  "Linkedin-Version": version,
});

/** Images API: registrar la subida, enviar los bytes y quedarse con el URN de la imagen. */
/** @param {{ token: string, personaId: string, datos: Uint8Array, version?: string, peticion?: typeof fetch }} opciones */
export async function subirImagen({ token, personaId, datos, version = VERSION_API, peticion = fetch }) {
  if (datos.length > MAX_BYTES_IMAGEN) throw new Error(`La imagen pesa ${datos.length} bytes y el máximo es ${MAX_BYTES_IMAGEN}.`);
  const inicio = await peticion("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: cabeceras(token, version),
    body: JSON.stringify({ initializeUploadRequest: { owner: `urn:li:person:${personaId}` } }),
  });
  if (!inicio.ok) throw new Error(`LinkedIn no abrió la subida de la imagen (${inicio.status}). ${(await inicio.text().catch(() => "")).slice(0, 300)}`.trim());
  const { value } = await inicio.json();
  if (!value?.uploadUrl || !value?.image) throw new Error("LinkedIn no devolvió dónde subir la imagen.");

  const subida = await peticion(value.uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
    body: datos,
  });
  if (!subida.ok) throw new Error(`LinkedIn rechazó la imagen (${subida.status}).`);
  return value.image;
}

/**
 * Publica y devuelve `{ id, url }`. Con `simular`, solo valida y devuelve el cuerpo.
 * `imagen` = `{ datos: Uint8Array, alt }`: se sube primero y se adjunta al post.
 */
/**
 * @param {{ token?: string, personaId: string, texto: string, imagen?: { datos: Uint8Array, alt: string }, version?: string, simular?: boolean, peticion?: typeof fetch }} opciones
 * @returns {Promise<{ id?: string, url?: string, simulado?: boolean, cuerpo?: any }>}
 */
export async function publicar({ token, personaId, texto, imagen, version = VERSION_API, simular = false, peticion = fetch }) {
  if (imagen && !imagen.alt) throw new Error("La imagen necesita su texto alternativo.");
  if (simular) return { simulado: true, cuerpo: cuerpoDePost({ personaId, texto, imagenUrn: imagen ? "urn:li:image:SIMULADA" : undefined, alt: imagen?.alt }) };
  if (!token) throw new Error("Falta LINKEDIN_ACCESS_TOKEN: hay que autorizar la app (npm run linkedin:autorizar).");
  const imagenUrn = imagen ? await subirImagen({ token, personaId, datos: imagen.datos, version, peticion }) : undefined;
  const cuerpo = cuerpoDePost({ personaId, texto, imagenUrn, alt: imagen?.alt });

  const respuesta = await peticion("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: cabeceras(token, version),
    body: JSON.stringify(cuerpo),
  });

  if (respuesta.status !== 201) {
    const detalle = await respuesta.text().catch(() => "");
    const pista =
      respuesta.status === 401
        ? " El permiso ha caducado o se ha revocado: hay que volver a autorizar (npm run linkedin:autorizar)."
        : "";
    throw new Error(`LinkedIn respondió ${respuesta.status}.${pista} ${detalle.slice(0, 400)}`.trim());
  }
  const id = respuesta.headers.get("x-restli-id");
  if (!id) throw new Error("LinkedIn dijo 201 pero no devolvió el identificador del post (x-restli-id).");
  return { id, url: urlDePost(id) };
}
