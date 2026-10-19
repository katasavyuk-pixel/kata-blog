/**
 * Lo que ejecuta el workflow `linkedin-publicar.yml`: lee el cuerpo de la issue
 * aprobada, publica en LinkedIn y deja el enlace en la salida del job.
 *
 * Entradas (variables de entorno, nunca el texto en la línea de comandos):
 *   POST_FILE              fichero con el cuerpo de la issue
 *   LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_ID, LINKEDIN_TOKEN_EXPIRES  (secretos)
 *   DRY_RUN=true           valida el texto y el formato sin publicar nada
 *   GITHUB_OUTPUT          lo pone Actions; aquí salen `url` y `dias`
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { diasHastaCaducar, extraerImagen, extraerPost, publicar } from "./linkedin.mjs";

const salida = (clave, valor) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${clave}=${valor}\n`);
};

try {
  const cuerpo = readFileSync(process.env.POST_FILE ?? "scratch/post.md", "utf8");
  const texto = extraerPost(cuerpo);
  const declarada = extraerImagen(cuerpo);
  if (declarada && !existsSync(declarada.ruta)) {
    throw new Error(`La imagen ${declarada.ruta} no está en el repositorio (¿falta fusionar la PR que la añade?).`);
  }
  const imagen = declarada ? { datos: readFileSync(declarada.ruta), alt: declarada.alt } : undefined;
  const simular = process.env.DRY_RUN === "true";

  const dias = diasHastaCaducar(process.env.LINKEDIN_TOKEN_EXPIRES);
  if (dias !== null) salida("dias", String(dias));
  if (dias !== null && dias < 0 && !simular) {
    throw new Error("El permiso de LinkedIn caducó: hay que volver a autorizar (npm run linkedin:autorizar).");
  }

  const resultado = await publicar({
    token: process.env.LINKEDIN_ACCESS_TOKEN,
    personaId: process.env.LINKEDIN_PERSON_ID,
    texto,
    imagen,
    version: process.env.LINKEDIN_VERSION || undefined,
    simular,
  });

  if (resultado.simulado) {
    console.log(`Ensayo: el post es válido (${texto.length} caracteres${imagen ? `, con imagen ${declarada.ruta}` : ", sin imagen"}). No se ha publicado nada.`);
    salida("url", "");
  } else {
    console.log(`Publicado: ${resultado.url}`);
    salida("url", resultado.url);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
