/**
 * Autorizar la app de LinkedIn con el perfil de Kata (una vez, y de nuevo cada
 * ~60 días: el permiso caduca y este producto no se renueva solo).
 *
 *   npm run linkedin:autorizar
 *
 * Qué hace: abre el flujo OAuth en el navegador, recibe el código en
 * http://localhost:8765/callback, lo cambia por el permiso y guarda en los
 * secretos de GitHub (`gh secret set`, sin mostrarlos):
 *   LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_ID, LINKEDIN_TOKEN_EXPIRES
 *
 * Qué necesita: `gh` con sesión, y el Client ID y el Client Secret de la app
 * (variables LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET, o los pide aquí; el
 * secreto se escribe sin que se vea). La URL `http://localhost:8765/callback`
 * (o la del puerto que pongas en LINKEDIN_PUERTO) tiene que estar en
 * «Authorized redirect URLs» de la pestaña Auth de la app.
 *
 * Nada de esto pasa por el chat ni se escribe en disco ni en el repositorio.
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

const REPO = process.env.GITHUB_REPOSITORY ?? "katasavyuk-pixel/blog-newsletter";
// 8765 por defecto; si está ocupado (el hub de contenido usa ese), LINKEDIN_PUERTO=8766 y la misma URL en la app.
const PUERTO = Number(process.env.LINKEDIN_PUERTO) || 8765;
const REDIRECT = `http://localhost:${PUERTO}/callback`;
const SCOPES = "openid profile w_member_social";

function preguntar(texto, { oculto = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) {
      rl._writeToOutput = (cadena) => {
        if (cadena.includes(texto)) process.stdout.write(cadena);
      };
    }
    rl.question(texto, (respuesta) => {
      rl.close();
      if (oculto) process.stdout.write("\n");
      resolve(respuesta.trim());
    });
  });
}

function guardarSecreto(nombre, valor) {
  const r = spawnSync("gh", ["secret", "set", nombre, "--repo", REPO], { input: valor, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`No se pudo guardar ${nombre} en GitHub: ${r.stderr.trim()}`);
  console.log(`  ✔ ${nombre} guardado en los secretos de GitHub`);
}

function esperarCodigo(estado) {
  return new Promise((resolve, reject) => {
    const servidor = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PUERTO}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get("error_description") || url.searchParams.get("error");
      const codigo = url.searchParams.get("code");
      const bien = !error && codigo && url.searchParams.get("state") === estado;
      res.writeHead(bien ? 200 : 400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(bien ? "<h1>Listo ✅</h1><p>Ya puedes cerrar esta pestaña y volver a la terminal.</p>" : "<h1>Algo falló</h1><p>Vuelve a la terminal.</p>");
      servidor.close();
      if (bien) resolve(codigo);
      else reject(new Error(error || "La respuesta de LinkedIn no coincide con la petición (state)."));
    });
    servidor.on("error", reject);
    servidor.listen(PUERTO, "127.0.0.1");
    setTimeout(() => {
      servidor.close();
      reject(new Error("Pasaron 5 minutos sin autorizar."));
    }, 300_000).unref();
  });
}

const clientId = process.env.LINKEDIN_CLIENT_ID || (await preguntar("Client ID de la app: "));
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || (await preguntar("Client Secret (no se verá): ", { oculto: true }));
if (!clientId || !clientSecret) {
  console.error("Faltan el Client ID o el Client Secret.");
  process.exit(1);
}

const estado = randomBytes(16).toString("hex");
const autorizar = new URL("https://www.linkedin.com/oauth/v2/authorization");
autorizar.search = new URLSearchParams({
  response_type: "code",
  client_id: clientId,
  redirect_uri: REDIRECT,
  state: estado,
  scope: SCOPES,
}).toString();

console.log("\nAbre esta dirección en el navegador donde tienes tu LinkedIn y pulsa «Permitir»:\n");
console.log(autorizar.toString(), "\n");
spawnSync("open", [autorizar.toString()], { stdio: "ignore" });

try {
  const codigo = await esperarCodigo(estado);

  const respuesta = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: codigo,
      redirect_uri: REDIRECT,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok || !datos.access_token) {
    throw new Error(`LinkedIn no dio el permiso: ${datos.error_description || datos.error || respuesta.status}`);
  }

  const perfil = await (
    await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${datos.access_token}` } })
  ).json();
  if (!perfil.sub) throw new Error("No se pudo leer tu identificador de LinkedIn (¿falta el producto «Sign In with LinkedIn using OpenID Connect»?).");

  const caduca = new Date(Date.now() + (datos.expires_in ?? 5_184_000) * 1000).toISOString().slice(0, 10);
  console.log(`\nAutorizado como ${perfil.name ?? "tu perfil"}. El permiso caduca el ${caduca}. Guardando…`);
  guardarSecreto("LINKEDIN_ACCESS_TOKEN", datos.access_token);
  guardarSecreto("LINKEDIN_PERSON_ID", perfil.sub);
  guardarSecreto("LINKEDIN_TOKEN_EXPIRES", caduca);
  console.log("\nListo. No hay nada más que copiar: el workflow ya puede publicar cuando pongas la etiqueta.");
} catch (error) {
  console.error(`\n✖ ${error.message}`);
  process.exit(1);
}
