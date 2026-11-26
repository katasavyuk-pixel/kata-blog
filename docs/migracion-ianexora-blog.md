# Migración del blog a ianexora.com/blog: plan técnico

Fecha: 26-nov-2026 (Europe/Madrid). Ejecutor: Nexo. Base: `migracion_blog_nbi.md` (Marketing), aprobada por Kata el 26/11 a las 08:19, y sus cambios de marca del §10, aprobados a las 08:37.
**Fase actual: SOLO PREPARACIÓN.** No se ha tocado DNS, ni dominios de Vercel, ni variables de entorno de producción, ni secretos. No se ha fusionado nada y `DOWNLOAD_LINK_SECRET` no se rota.

- Redirecciones: `migracion_blog_redirecciones.csv` (223 filas; conflictos marcados como RESUELTO con la decisión de Kata del 26/11 a las 9:07).
- PRs en borrador: kata-blog y NBI-WEB, rama `luna/2026-11-26-migracion-blog` en los dos repos (las URLs, al final).
- Diseño personal conservado en la rama y etiqueta anotada `design/blog-personal-v1` del repo kata-blog, con `DESIGN-BLOG-PERSONAL.md`.

---

## 1. Arquitectura elegida: multi-zones de Next (basePath + rewrite)

**Cómo funciona:**

- **kata-blog** (Next 16 + Velite, proyecto de Vercel `kata-ivanovych-blog`) se construye con `basePath: "/blog"`. Todas sus rutas, assets (`/blog/_next/…`) y APIs viven bajo `/blog`.
- **NBI-WEB** (ianexora.com, Next 15) añade un `rewrite` de `/blog` y `/blog/:path+` hacia el dominio de producción del proyecto del blog, `https://kata-ivanovych-blog.vercel.app`. El origen se puede configurar con `BLOG_ORIGIN`.
- La URL pública es `https://ianexora.com/blog/<ruta>`, servida sin redirección.
- **kata.ianexora.com, blog.ianexora.com y www.blog.ianexora.com** se quedan conectados al proyecto del blog solo para responder con 301. Las reglas van en `next.config.ts` con `basePath:false` y `has: host`. Conservan la ruta y la query y llegan en un salto.

**Por qué esta opción:**

| Opción | Veredicto | Motivo |
|---|---|---|
| **Multi-zones, basePath + rewrite** | **Elegida** | Es el patrón documentado de Next ([multi-zones](https://nextjs.org/docs/app/guides/multi-zones)). Cada app conserva su repo, su despliegue, su versión de Next y sus reglas. NBI-WEB sigue con cero cookies, la CSP estricta y el tope de 130 kB, y nada del blog entra en su bundle. El rollback es independiente en cada proyecto. |
| Subdominio blog.ianexora.com | Descartada | Marketing (§2 de su plan) y Kata quieren el blog en el dominio de empresa. Para Google, un subdominio es otro sitio en la práctica. |
| Rutas en la raíz de ianexora.com, sin /blog | Descartada | Choca con `/guias`, `/privacidad`, `/cookies`, `/_next` y `/api`, y ensucia el espacio de nombres de NBI. |
| Fusionar los dos repos | Descartada | Next 15 frente a 16. El blog usa cookies (suscriptor, panel), Turnstile, YouTube y Supabase, y rompería el «cero cookies», la CSP y el presupuesto de JS de NBI-WEB. Es una migración grande y con mucho riesgo. |
| Paquete npm compartido para la cabecera y el pie | Descartada por ahora | Necesita un registro y publicar versiones, y los dos repos van en versiones de Next distintas. Se ha optado por una copia con nota de sincronización (§3). |
| Proxy de Cloudflare o un Worker | Descartada | El DNS ya apunta a Vercel. Añadiría otra pieza y cambios de DNS que esta fase prohíbe. |

**Pruebas hechas en local (26-nov, ~08:45–08:55 Europe/Madrid):**

- **Build de producción del blog servido en :3001.** Rastreo de las 70 URLs del sitemap y de los 317 enlaces, imágenes, `srcset` y `action` internos: 0 roturas y 0 redirecciones internas. La única excepción es `_next/image` con miniaturas de i.ytimg.com, que en local da 400 por el optimizador local; en producción funciona (comprobado contra kata.ianexora.com).
- **Build de NBI-WEB en :3002 con `BLOG_ORIGIN=http://localhost:3001`:**
  - `/blog`, `/blog/que-es-rag`, `/blog/lecturas`, `sitemap.xml`, `feed.xml`, `llms.txt`, `icon.svg`, `/blog/nbi/logo-horizontal.png` y `/blog/_next/image`: todos 200.
  - `/blog/por-que-hago-esto` y `/blog/sobre-mi`: 301 a `https://ianexora.com/sobre-katalin-savyuk`.
  - `/blog/blog/que-es-rag`: 301 a `/blog/que-es-rag`, que el navegador resuelve sobre el host público.
  - `POST /blog/api/subscribe`: 400 (validación). Llega al blog.
  - `/blog/api/download` sin secreto en local: 503. Llega al blog.
- **Hosts antiguos**, con `curl -H "Host: …"` sobre 20 rutas × 3 hosts (detalle en el CSV): todo responde 301 en un salto y conserva la query. Ejemplos:
  - `kata.ianexora.com/api/download?slug=…&e=…&exp=…&sig=…` → `https://ianexora.com/blog/api/download?slug=…&e=…&exp=…&sig=…`
  - `/blog?utm_source=ig&utm_campaign=20` → `/blog/lecturas?utm_source=ig&utm_campaign=20`

## 2. Impacto del basePath, punto por punto

**Lo que Next hace solo:** prefija `<Link>`, `redirect()`, `router.*`, `metadataBase` y las rutas de metadatos.

**Lo que NO prefija, y cómo se ha resuelto en el PR de kata-blog:**

| Pieza | Riesgo | Solución en el PR |
|---|---|---|
| `fetch("/api/…")` de cliente (alta, panel, contacto, envío de newsletter, prueba) | Iría a `ianexora.com/api/…`, que es de NBI | `conBase()` de `src/config/base-path.ts` en los 5 sitios |
| `<a href>`, `<form action>` y enlaces a feeds escritos a mano | Se escapan de la zona | `conBase()` en el formulario, la calculadora, YouTube, el panel, lecturas, el pie, la bitácora y noticias |
| `next/image` con `src` local | El optimizador ya va a `/blog/_next/image`, pero el `src` no lleva prefijo | Envoltorio `src/components/ui/imagen.tsx` con `conBase` en todas las importaciones |
| MDX: enlaces markdown | Contenido escrito para el sitio viejo (`/blog/<slug>`) | El override `a` de MDX usa `rutaInterna()`. Además se reescribió el contenido: 24 ficheros, de `/blog/<slug>` a `/<slug>` |
| MDX: `<img>` en JSX crudo | El override no lo captura | 9 `src` cambiados a `/blog/capturas/…` en 3 posts |
| HTML generado desde markdown (ediciones de newsletter, bitácora, noticias por mes) | Enlaces raíz como `/herramientas/…` se escapaban | `htmlConBase()` al pintar |
| `NextResponse.redirect(new URL(x, request.url))` | Detrás del rewrite, `request.url` lleva el host vercel.app | `urlPublica()` sobre `siteConfig.url` en confirm, unsubscribe, panel/login y download |
| Cron de Vercel | `vercel.json` no conoce el basePath | `"/blog/api/cron/noticias"` |
| Vercel Analytics / Speed Insights | Necesitan el basePath | Vercel define `NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH` solo. Verificarlo en el preview y tras el corte |
| ISR (`revalidate`) | Sin cambios | Las páginas se revalidan en el proyecto del blog; el rewrite sirve la versión cacheada de Vercel |
| OG (`opengraph-image`) | Resuelto con `metadataBase` | og:image en `https://ianexora.com/blog/opengraph-image`. La tarjeta usa `siteConfig.name`, ahora «Blog de Nexora Business Intelligence» |
| RSS | Funciona | `/blog/feed.xml`, `/blog/noticias/feed.xml` y `/blog/bitacora/feed.xml`, con enlaces absolutos a ianexora.com/blog y © «NBI · Nexora Business Intelligence» |
| llms.txt | Encabezado nuevo | `/blog/llms.txt` con «# Blog de Nexora Business Intelligence», el autor Katalin Savyuk y un enlace a `ianexora.com/llms.txt`. El llms.txt de NBI enlaza el del blog |
| robots | Los rastreadores **solo** leen `ianexora.com/robots.txt` | `/blog/robots.txt` existe pero no cuenta. NBI-WEB añade `Disallow: /blog/api/`, `/blog/gracias` y `/blog/baja` en todos los grupos, y `Sitemap: https://ianexora.com/blog/sitemap.xml`. `/blog/panel` no se lista a propósito: ya lleva noindex y listarlo lo anunciaría |
| sitemap | 70 URLs | `https://ianexora.com/blog/sitemap.xml`. La home es `https://ianexora.com/blog`, sin barra final, porque `/blog/` da 308. Canonical y og:url de la home también van sin barra |
| IndexNow | La clave da validez por ruta | `DEFAULT_HOST=https://ianexora.com/blog`. keyLocation: `ianexora.com/blog/indexnow-<clave>.txt`, válida para las URLs bajo /blog |
| CI del blog | El SEO check hacía curl a `/` | Ahora apunta a `localhost:3001/blog` con `--site https://ianexora.com/blog`. `scripts/seo/check.mjs` no se toca porque guarda paridad de hash con NBI-WEB |

## 3. Diseño: el blog con la cabecera, el menú, el pie, la paleta y la tipografía de ianexora.com

**Enfoque:** se copian a kata-blog los tokens y la estructura de NBI-WEB. No se comparte código.

- `src/config/nbi-chrome.ts` es una copia de `nav` y `footer` de NBI-WEB (`lib/content/site.ts`), sin las páginas de Irún.
- `src/components/layout/nbi-chrome.css` trae:
  - la cabecera sticky de 72/80 px con logo de 36/40 px;
  - el menú con subrayado cian;
  - la píldora navy «Pedir la llamada»;
  - el pie navy `#031a34` con radio de 32 px.
- `globals.css` toma la paleta de NBI (fondo `#fff`, superficies `#f4f8fb`, tinta `#071e38`, acentos navy `#0c3558` y cian `#07738d`) y sus sombras.
- Tipografía Instrument Sans e Instrument Serif, como en NBI.
- Debajo de la cabecera de NBI hay una sub-barra discreta con «Blog de NBI» y las secciones (Artículos, Marketplace, Herramientas, Newsletter), más «Suscríbete».
- El menú de NBI-WEB gana «Blog» (`/blog`), con `<a>` y no `<Link>` porque cruza de zona. El pie de NBI cambia «Notas» por «Blog».

**Ventajas y costes:**

- (+) Se ve como una sola web y no añade una dependencia nueva.
- (−) Son dos copias que hay que sincronizar a mano si cambia el menú de NBI. Hay una nota en `nbi-chrome.ts` y el plan de después incluye un test de paridad.

**Riesgos visuales, revisados en capturas de escritorio y de móvil:**

- Instrument Sans en textos largos. Se ha subido el cuerpo a 17–18,5 px y se han reducido h1 y h2 para que nada quede sobredimensionado.
- El acento rojo del blog personal desaparece y se sustituye por navy y cian.
- La plantilla OG genera la tarjeta con el nombre nuevo. Los colores de `og-card` siguen siendo los del blog, un ajuste menor para después.
- El pie del blog no lleva la ubicación ni los enlaces de Irún (regla del blog), así que difiere un poco del de NBI.

## 4. Marca (§10, implementado en el PR de kata-blog)

1. **Nombre y logo.** Nombre «Blog de Nexora Business Intelligence», corto «Blog de NBI».
   - Títulos con la plantilla `%s · Blog de NBI` (el nombre largo pasaba de 60 caracteres en los títulos).
   - `og:site_name` con el nombre largo.
   - Favicon de NBI (`src/app/icon.svg`, `apple-icon.png`). Se borra `favicon.ico`.
   - El logo horizontal de NBI enlaza a `https://ianexora.com/`.
   - Fuera «Kata Savyuk» y «cuaderno de obra» como marca. `author.name` pasa a «Katalin Savyuk».
2. **Cabecera, menú y pie de ianexora.com.** Se va el menú de revista (Noticias, Bitácora, Sobre mí).
3. **Home nueva.** Hero, «Artículos útiles» (6), «Kits y skills para descargar» (6), Newsletter de NBI y el bloque «¿Quieres verlo en tu negocio?».
   - CTA «Pedir la llamada» → `https://ianexora.com/contacto`, el mismo destino que el `nav.cta` de ianexora.com fuera de su home y que el pie de NBI. No se inventa ninguno.
   - Enlace secundario al diagnóstico con UTM.
   - La portada antigua queda en la etiqueta `design/blog-personal-v1`.
4. **Caja de autor.** «Katalin Savyuk, fundador de Nexora Business Intelligence (NBI)» → `https://ianexora.com/sobre-katalin-savyuk`. NBI-WEB tiene `app/sobre-katalin-savyuk/page.tsx` y responde 200 en el build local; en producción, verificar en el corte. La firma de cada artículo también enlaza ahí.
5. **`/sobre-mi`** → 301 a esa página. La página `/sobre-mi` del blog se elimina, y la historia personal queda en la etiqueta.
6. **Correos.**
   - Remitente «Katalin Savyuk (NBI)». El nombre se fuerza en el código y la dirección sale de `RESEND_FROM`, o `news@news.ianexora.com` por defecto. No se toca la configuración de Resend.
   - Newsletter «Newsletter de NBI» en la confirmación, las ediciones y la bienvenida.
   - La firma «Kata» pasa a «Katalin Savyuk, fundador de NBI».
7. **Textos legales, llms.txt y ©.**
   - Privacidad del blog: responsable «Katalin Savyuk, persona física que ejerce por cuenta propia bajo la marca comercial NBI · Nexora Business Intelligence», con enlace al aviso legal de ianexora.com para los datos completos. **Sin domicilio y sin NIF.**
   - Cookies a nombre del «Blog de Nexora Business Intelligence (ianexora.com/blog)».
   - © «NBI · Nexora Business Intelligence» en el pie y en los feeds.
8. **Posts retirados.** `por-que-hago-esto`, `lo-que-me-cuesta-avanzar` y `bienvenida` → 301 a `/sobre-katalin-savyuk` (decisión de Kata, 26/11 9:07).
   - 301 y no 410, porque tienen enlaces y la intención de quien llega encaja con el destino.
   - Se conservan en la etiqueta.
   - Las referencias internas se han reescrito: puentes, newsletters y bitácora.

**Después del corte, solo planificado:**
- La Bitácora sale del menú (ya fuera en este PR; la página sigue viva).
- Las noticias diarias se mudan al futuro blog personal (§11, decisión de Kata del 26/11 a las 9:17–9:19). Las ya publicadas siguen en /blog/noticias, fuera del menú y de la home.
- Marketplace y Herramientas pasan a llamarse «Recursos de NBI».
- «Lecturas» se renombra «Blog» (decisión de Kata, 26/11 9:07). La ruta /blog/lecturas puede quedarse, o pasar a /blog/articulos con 301; se decide al hacerlo.
- `/trabaja-con-nbi` → 301 a `/contacto` o al diagnóstico (recomendación del §10).
- Test de paridad de la cabecera y el pie entre los dos repos.

## 5. Cookies y autenticación de /panel

- **`nbi_subscriber`**: path `/` pasa a `/blog`, así ianexora.com fuera de /blog sigue sin cookies, como promete NBI.
- **`nbi_panel`**: `/panel` pasa a `/blog/panel`.
- Las cookies del host viejo no viajan a ianexora.com. Los suscriptores vuelven a ser «no confirmados» para la interfaz, aunque los enlaces firmados siguen funcionando, y Kata tiene que volver a entrar en el panel.
- **Comprobación de Origin del panel:** detrás del rewrite, `request.url` lleva el host vercel.app. Se acepta el Origin de la petición o el de `siteConfig.url` (`https://ianexora.com`).
- **Supabase:** el blog no usa Supabase Auth para usuarios. Solo `getClaims()` en el middleware, sin sesiones: no hay correos de Auth ni redirect URLs que dependan del host.
  - Recomendación, con OK de Kata y en el corte: añadir `https://ianexora.com/blog/**` a Auth → URL Configuration en el proyecto `udluclqhfzdgvqpoezoo`, por si algún día se usa.
  - Los correos los manda Resend, con URLs construidas desde `siteConfig.url`.
- **Turnstile:** hay que añadir el hostname `ianexora.com` al widget en Cloudflare. Sin eso, los formularios fallan en ianexora.com/blog. Es una acción de Kata y de cuenta.
- **CSP:** la de NBI-WEB (`vercel.json`) se aplicaba a `/(.*)`. Ahora la CSP va en una regla `/((?!blog$|blog/).*)`, y las demás cabeceras (HSTS, nosniff, X-Frame-Options, Referrer-Policy y Permissions-Policy) siguen en `/(.*)`. Si no, bloquearía Turnstile, YouTube y el colector de analítica del blog. Verificarlo en el preview, porque `vercel.json` no se aplica en `next start`.

## 6. Correos (Supabase y Resend), enlaces firmados y campañas

- **Plantillas** (`src/emails/*`, `content/emails/*`, `src/lib/newsletter.tsx`, `welcome-sequence.tsx`): construyen URLs con `siteConfig.url`.
  - Con `NEXT_PUBLIC_SITE_URL=https://ianexora.com/blog` en Vercel, los correos nuevos enlazan ya a la URL nueva.
  - Si no se cambia, el valor por defecto del código ya es ianexora.com/blog, pero la variable de Vercel lo pisa. **Hay que cambiarla en el corte, con OK de Kata.**
- **Enlaces firmados de `/api/download`:**
  - `src/lib/signed-links.ts` firma `${slug}|${email}|${exp}` con HMAC-SHA256, TTL de 30 días y secreto `DOWNLOAD_LINK_SECRET`. No cubre host ni ruta.
  - El 301 de un salto conserva ruta y query (probado), y llega al mismo proyecto con el mismo secreto, así que la firma verifica.
  - **No rotar `DOWNLOAD_LINK_SECRET`.**
- **Confirmación, baja y panel:** los enlaces de correos ya enviados (`/api/confirm?…`, `/api/unsubscribe?…`) llegan con un 301 de un salto. Las redirecciones internas usan `urlPublica()`, así que no aterrizan en vercel.app.
- **Imágenes de correos ya enviados** (`/correo/*`): 301 a ianexora.com/blog/correo/*. Gmail y los clientes habituales siguen el 301.
- **ig-dm, campaña 20 (AUDITORIA → `te-recomienda-la-ia`) y el resto de campañas activas.** `resource_url` vive en la tabla de producción de Supabase, que no se ha leído ni tocado.
  - Los clics viejos los recoge el 301.
  - El mismo día del corte, Marketing cambia `resource_url` a `https://ianexora.com/blog/te-recomienda-la-ia`.
  - Los UTM no cambian: solo el host y la ruta.
- **Workflow `noticias-diarias`:**
  - Publica comiteando a main como `github-actions[bot]`, y Vercel despliega el proyecto del blog. No hay cambios de URL en el workflow.
  - El cron de Vercel ya apunta a `/blog/api/cron/noticias`.
  - Si Vercel solo despliega commits de Kata, esos commits del bot no se despliegan solos. **Se resuelve cuando el generador se mude al blog personal (§11), no ahora** (decisión de Kata, 26/11 9:17–9:19). Esta migración no toca el workflow.
- **Newsletter:**
  - `POST /api/newsletter/send` está protegido por secreto. Quien lo llame (panel o script) debe usar `https://ianexora.com/blog/api/newsletter/send`. El panel ya llama con `conBase`.
  - Los `curl` de los comentarios del código siguen citando kata.ianexora.com: son solo documentación y el 301 recoge un GET, pero **no un POST**.
- **irun-guardian** (`tests/irun-guardian.test.ts`): recorre `content/` y `src/`, y pasa. La cabecera y el pie copiados de NBI excluyen las páginas de Irún y la ubicación.

## 7. SEO: canonicals, hreflang, JSON-LD, sitemap y Search Console

- **Canonicals:** todas absolutas a `https://ianexora.com/blog/…`, vía `metadataBase` = `siteConfig.url`. La home es `https://ianexora.com/blog`. Los previews no se indexan porque las canónicas apuntan a producción.
- **hreflang:** no hay, porque el sitio es solo es-ES. No se añade.
- **JSON-LD:**
  - El nodo Organization es el de NBI: `publisher`/`worksFor` = `https://ianexora.com/#organization`.
  - El nodo Person es el mismo `@id` que en ianexora.com (`/sobre-katalin-savyuk#person`). `sameAs` cambia `https://kata.ianexora.com` por `https://ianexora.com/blog` **en los dos repos a la vez**, para la paridad que comprueba `check.mjs`.
  - Blog y WebSite: `https://ianexora.com/blog/#website` y `…/lecturas#blog`.
- **Sitemap nuevo:** `https://ianexora.com/blog/sitemap.xml`, con 70 URLs. Va listado también en el robots de NBI.
- **Search Console (propiedad `sc-domain:ianexora.com`, que cubre los dos hosts):**
  1. Tras el corte, enviar `https://ianexora.com/blog/sitemap.xml` en Sitemaps.
  2. Mantener el sitemap viejo de kata.ianexora.com unos días. Ahora es un 301 al nuevo, lo que ayuda a descubrir los 301.
  3. Inspección de URL y «Solicitar indexación» para la home del blog y los 10–20 artículos con más clics (lista en §1.3 del plan de Marketing).
  4. Vigilar los informes de páginas y redirecciones durante 4–8 semanas.
  - **Por qué no sirve «Cambio de dirección»:** solo funciona de dominio a dominio, a nivel de propiedad. No sirve para mover un subdominio a una ruta del mismo dominio ([documentación de Google](https://support.google.com/webmasters/answer/9370220)). La señal la dan el 301 de un salto, las canónicas, el sitemap nuevo y la inspección.

## 8. Orden del corte (necesita el OK de Kata) y rollback

**Antes del corte:**
- Revisar los dos PRs en borrador y sus previews.
- Kata aprueba el texto legal.
- Marketing lista las `resource_url` vivas de ig-dm.

**Pasos del corte:**

1. **Variables de entorno de Vercel del proyecto del blog** (Kata):
   - `NEXT_PUBLIC_SITE_URL=https://ianexora.com/blog` en Production.
   - `RESEND_FROM` puede quedarse: el nombre visible lo fuerza el código.
   - No tocar `DOWNLOAD_LINK_SECRET`.
2. **Cloudflare Turnstile:** añadir el hostname `ianexora.com` al widget (Kata).
3. **Fusionar primero el PR de NBI-WEB** (rewrite, «Blog» en el menú, CSP fuera de /blog, robots, llms y enlaces).
   - Mientras el blog no tenga basePath, `ianexora.com/blog` mostrará el archivo antiguo con los estilos rotos: sus assets apuntan a `/_next`, que es de NBI. Dura unos minutos, solo se llega desde el menú nuevo y no deja nada cacheado.
   - El orden inverso dejaría a kata.ianexora.com con un 301 hacia un 404, y los navegadores **cachean los 301**. Por eso se recomienda este orden.
4. **Fusionar el PR de kata-blog** justo después. El commit tiene que ser de Kata, porque Vercel solo despliega sus commits. Al desplegar:
   - kata.ianexora.com/* responde 301 a ianexora.com/blog/*;
   - `https://ianexora.com/blog` y 5 artículos dan 200 con el diseño nuevo;
   - `/robots.txt` lleva el Sitemap del blog;
   - la respuesta de /blog no trae la CSP de NBI.
5. **Dominios de Vercel** (Kata):
   - En el proyecto del blog, quitar la redirección de dominio 308 de `blog.ianexora.com` (y `www.blog.ianexora.com`) hacia kata.ianexora.com y dejarlos conectados sin redirección, para que respondan las reglas de la app en un salto.
   - `kata.ianexora.com` sigue conectado.
   - No hace falta tocar el DNS.
6. **Pruebas de humo:**
   - las 20 rutas × 3 hosts de este plan, con curl;
   - un enlace firmado real de descarga;
   - alta con Turnstile;
   - confirmación y baja;
   - login del panel;
   - un envío de prueba de la newsletter.
7. **Search Console:** sitemap, inspección e indexación de las URLs principales.
8. **Marketing, el mismo día:** `resource_url` de ig-dm (campaña 20 incluida), bios, firmas y URL por defecto de las rutinas.

**Rollback:**
- Vercel Instant Rollback en los dos proyectos al despliegue anterior. Tarda unos segundos y vuelve a dejar kata.ianexora.com sirviendo el blog en la raíz.
- Revertir los merges con un PR de revert, nunca con force-push.
- Restaurar `NEXT_PUBLIC_SITE_URL` y la redirección de dominio de blog.ianexora.com si se cambiaron.
- Los enlaces firmados siguen valiendo en las dos direcciones porque el secreto no cambia.

## 9. Decisiones de Kata

**Resueltas el 26/11 a las 9:07** (ya aplicadas en los PRs, el CSV y este plan):

1. Se mantienen `/blog/privacidad` y `/blog/cookies`.
2. La raíz `kata.ianexora.com/` va a la home del blog.
3. Los tres posts retirados van con 301 a `/sobre-katalin-savyuk`.
4. «Lecturas» se renombra «Blog» después del corte. Queda en el plan de después (§4), no se implementa ahora.
5. El domicilio de la página de privacidad de ianexora.com se queda, porque lo exige la LSSI. **No se añade en ningún otro sitio**: ni en el blog, ni en los correos (tampoco en sus pies), ni en ningún pie de página. Lo comprueba un test de los correos (`estaEnElDisenoDeNbi`, en `tests/newsletter-edicion.test.ts`).

**Resueltas el 26/11 a las 9:17–9:19** (noticias; detalle en §11):

6. Las noticias diarias son del futuro blog personal, no del blog de NBI.
7. Las ya publicadas se quedan en /blog: 200, en el sitemap como hasta ahora, sin 410 y sin redirigirlas fuera de su propia URL.
8. Fuera de la home, del menú y del pie del blog de NBI. Las páginas siguen vivas.
9. La generación de noticias se muda al blog personal cuando se monte, y el despliegue de `github-actions[bot]` en Vercel se arregla entonces.

**Siguen abiertas:**

- Orden de fusión: NBI-WEB primero y kata-blog justo después (recomendado; se explica en §8).
- Opcional: añadir `ianexora.com/blog/**` a las redirect URLs de Supabase Auth.
- (Aplazada al blog personal, §11) el despliegue de los commits de `github-actions[bot]` con la regla «solo commits de Kata».
- Si la página de privacidad de NBI-WEB debe decir algo del blog. Necesita un texto de Kata.

**El corte sigue SIN aprobar:** no se fusiona nada.

## 10. Correos en el diseño de NBI (aprobado por Kata el 26/11 a las 9:03)

Afecta a todos los correos automáticos: la confirmación (doble opt-in), la entrega de kits o descargas, la secuencia de bienvenida y la plantilla de la newsletter (ediciones visuales y antiguas).

**Qué cambia (PR de kata-blog):**

- **Marco común** en `src/emails/marco.tsx`:
  - cabecera blanca con el logo de NBI, enlazado a ianexora.com;
  - a la derecha, «Newsletter de NBI» y la fecha o la semana;
  - la carta blanca con esquinas de 16 px sobre el azul pálido de NBI;
  - el pie navy de ianexora.com (`#031a34`), con la baja o el motivo del correo y la línea «NBI · Nexora Business Intelligence · ianexora.com».
  - **Sin domicilio.**
- **Paleta** en `src/lib/email-colors.ts`, la de ianexora.com:
  - tinta `#071e38`;
  - enlaces cian `#07738d` (5,46:1 sobre blanco);
  - reglas cian `#0d94b5`;
  - botón en píldora navy `#0c3558`, como «Pedir la llamada»;
  - cajas `#eaf2f8`.
  - Desaparecen el rojo y la serif Georgia del blog personal.
- **Tipografía:** `'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif`. Ningún cliente de correo carga fuentes web con garantía, así que se nombra primero y cae a las del sistema. Los títulos van en seminegrita, como los h1 y h2 de ianexora.com.
- **Técnica segura para correo:**
  - maquetación con tablas (Row/Column de React Email) y estilos en línea;
  - el HTML de markdown se estiliza etiqueta por etiqueta (`estilarHtml`);
  - los bloques prerenderizados (botón, regalo, desglose de costes) usan la misma paleta;
  - Outlook clásico cuadra las esquinas y la píldora, sin romper nada.
- **Logo:** `https://ianexora.com/blog/correo/nbi-logo-correo.png`, un PNG de 300×90 que se muestra a 150×45, con el fondo blanco incluido para que se lea en modo oscuro.
  - Es una URL absoluta y fija, no `siteConfig.url`, porque los previews lo sobrescribirían con una URL protegida.
  - **Existe a partir del corte.** Hasta entonces, un correo de prueba mandado desde un preview mostraría el texto alternativo «NBI · Nexora Business Intelligence», y el rótulo «Newsletter de NBI» va en texto.
- **Modo oscuro:**
  - `<meta name="color-scheme" content="light dark">` y una hoja `@media (prefers-color-scheme: dark)` para Apple Mail, iOS y Outlook para Mac, más las copias `[data-ogsc]` para Outlook.com;
  - colores en oscuro: fondo navy, texto `#e6eef6`, enlaces `#5cc8e0` y botón cian con texto navy;
  - Gmail ignora la media query e invierte por su cuenta: el texto oscuro sobre claro se invierte bien y el logo conserva su fondo blanco.

**Comprobado sin enviar ningún correo:**

- Cada plantilla se ha renderizado a HTML y a PNG en `/tmp/email-previews/`, en claro y en oscuro.
- Tests nuevos en `tests/newsletter-edicion.test.ts`. Para la edición y la confirmación comprueban:
  - el logo (PNG absoluto y su alt);
  - la meta de esquema de color y la media query oscura;
  - la pila tipográfica y el pie navy;
  - que no quedan el rojo ni Georgia;
  - que no hay domicilio, Irún, NIF ni «cuaderno de obra».
  - En la confirmación, además, el botón en píldora navy.

**Prueba de humo en el corte (la hace Kata, con su propio correo):**

1. Después del paso 4 de §8, con `NEXT_PUBLIC_SITE_URL` ya cambiada, Kata entra en `https://ianexora.com/blog/panel` y manda **una** prueba de la newsletter («Enviar prueba»): le llega solo a su propio correo (la dirección de respuesta), con «[PRUEBA]» en el asunto.
2. Kata se da de alta con su propio correo, recibe la confirmación, la confirma y recibe la bienvenida y el regalo. Pide un kit y recibe la entrega.
3. En cada correo revisa:
   - el remitente «Katalin Savyuk (NBI)»;
   - que el logo carga desde ianexora.com/blog;
   - que los enlaces van a ianexora.com/blog y que la baja funciona;
   - cómo se ve en Gmail web, en el móvil y en modo oscuro;
   - que ningún pie lleva domicilio.
4. Si el logo no carga, el texto alternativo mantiene el correo legible. Se revisa `public/correo/nbi-logo-correo.png` en el despliegue.

No se manda ningún correo a la lista como prueba. Las ediciones antiguas conservan sus GIF e imágenes con el rojo anterior (contenido histórico); las nuevas ya salen con el marco de NBI.

## 11. Noticias: fuera de las superficies de NBI y, más adelante, al blog personal (decisión de Kata, 26/11 9:17–9:19)

**En esta migración (PR de kata-blog):**

- **Menú:** el de NBI-WEB solo lleva «Blog», y la fila del blog (Artículos, Marketplace, Herramientas, Newsletter) no tiene Noticias. Sin cambios en NBI-WEB.
- **Home del blog:** no tiene «Noticia del día», ni tira ni columna de noticias. Se cambia el lema de `siteConfig.home`, que el pie muestra en todas las páginas: de «Noticias, herramientas y skills de IA para tu negocio.» a «Guías, herramientas y skills de IA para tu negocio.». La fecha del sitemap para la home ya no se mueve con cada noticia.
- **Pie:** se quita «RSS · noticias».
- **Archivo «Lecturas»:** se quitan sus dos enlaces a /noticias, la frase de la entradilla y el botón junto a los filtros.
- **Autodescubrimiento:** el feed de noticias ya no se anuncia en todas las páginas, solo en /noticias.
- **Lo que se queda igual:**
  - las 88 piezas publicadas responden 200 en `/blog/<slug>`;
  - `/blog/noticias`, `/blog/noticias/2026-10` y `/blog/noticias/feed.xml` siguen vivas;
  - desde los hosts viejos, cada noticia da 301 a su misma URL en ianexora.com/blog, nunca a otra página;
  - ni 410 ni redirección fuera de la pieza.
- **Sitemap e indexación, sin cambios respecto a kata.ianexora.com hoy:**
  - siguen `/noticias` y `/noticias/2026-10` (indexables);
  - las piezas sueltas llevan `noindex, follow` hasta que alguien las revisa (`esIndexable`), y por eso nunca han estado en el sitemap. Hoy ninguna de las 88 está revisada.
  - Si Kata quiere que las piezas sueltas se indexen, es otra decisión: quitar el `noindex` y añadirlas al sitemap.
- Lo comprueba `tests/noticias-fuera-de-superficies.test.ts`.
- **El generador sigue como está:** el workflow `noticias-diarias` y el cron no se tocan en esta migración. Las nuevas piezas siguen saliendo en /blog/noticias, fuera de las superficies, hasta la mudanza.

**Después, con el blog personal** (rama y etiqueta `design/blog-personal-v1`, dominio kataivanovych.com; no se monta ahora):

- La generación de noticias se muda allí, y Kata las comenta y opina en ellas.
- En ese momento se resuelve el despliegue en Vercel de los commits de `github-actions[bot]`.
- Temas que quiere allí:
  - IA;
  - empresas;
  - negocios;
  - actualidad importante de España;
  - economía y trading: macro, bancos centrales, datos que mueven el mercado, oro y Nasdaq.
- Qué hacer con las noticias ya publicadas en ianexora.com/blog al mudarse (dejarlas, o 301 una a una a su copia en kataivanovych.com) se decide entonces. Hasta esa decisión, siguen en /blog con 200.

