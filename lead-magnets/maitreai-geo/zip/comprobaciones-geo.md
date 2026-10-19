# Las 9 comprobaciones que hago antes de decir que un sitio está listo para una IA

En el vídeo solo cupieron dos. Aquí están las nueve, con el comando para hacerlas tú y lo que
salió en mi caso.

El orden importa: las tres primeras son las que rompen todo lo demás si están mal. Un `llms.txt`
precioso no arregla una página que devuelve un 404.

Sustituye `TUDOMINIO.com` por el tuyo. Todo lo de abajo se hace desde una terminal, sin instalar
nada raro, y sin tocar tu web.

---

## 1. Cada URL pública responde 200 y no redirige

**Por qué.** Un rastreador tiene un presupuesto: cuántas páginas tuyas se molesta en pedir. Cada
redirección se lo come y cada 404 lo desperdicia. Y lo que no llega a leer no lo puede citar.

```bash
curl -s https://TUDOMINIO.com/sitemap.xml \
  | grep -o '<loc>[^<]*' | sed 's/<loc>//' \
  | while read -r u; do
      printf '%-60s %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' "$u")"
    done
```

**Qué buscas.** Todo `200`. Un `301` o `308` en tu propio sitemap significa que estás anunciando
una dirección y sirviendo otra.

**Qué salió.** 33 URLs, todas 200, ninguna redirige. Antes eran 23, con la página de precios
redirigiendo a un ancla y dos formularios de acceso ocupando sitio que no aportan nada que leer.

---

## 2. Cada página declara su propia dirección canónica

**Por qué.** El canonical le dice a un buscador «la versión buena de esta página es esta». Si
nueve páginas declaran ser la portada, le estás diciendo que ocho de tus páginas no existen.

```bash
curl -s https://TUDOMINIO.com/una-pagina-cualquiera \
  | grep -o '<link rel="canonical"[^>]*'
```

**Qué buscas.** Que la URL que sale sea la de esa página, no la de la portada.

**Qué salió.** Nueve páginas decían ser la portada. Comprobé 18 en total; ahora cada una declara
la suya.

---

## 3. `robots.txt` no bloquea a los rastreadores de IA — y sigue protegiendo lo privado

**Por qué.** Es lo primero que pide cualquier bot. Y tiene una trampa que casi me come: **un bot
que encuentra un apartado con su propio nombre ignora el apartado general por completo.** Si le
das la bienvenida a uno con un `Allow: /` a secas, le acabas de abrir todo lo que tenías cerrado.

```bash
curl -s https://TUDOMINIO.com/robots.txt
```

**Qué buscas.** Dos cosas a la vez: que ningún rastreador de IA tenga un `Disallow: /`, y que
**cada apartado con nombre propio repita las mismas protecciones** que el general. Los nombres
que miro: GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-Web,
Google-Extended, Applebot-Extended, meta-externalagent, CCBot.

**Qué salió.** No había ninguno bloqueado, pero tampoco ninguno nombrado. Ahora hay 15 apartados
y los 14 con nombre repiten las 8 mismas exclusiones, desde una única lista en el código: no se
puede relajar una sin relajarlas todas.

---

## 4. Un solo nombre de marca, bajo un solo identificador

**Por qué.** Los datos estructurados usan un `@id` para decir «esto es la misma entidad que
aquello». Si el mismo identificador aparece con tres nombres distintos, un sistema que intente
consolidarte recibe tres respuestas y no se fía de ninguna.

```bash
curl -s https://TUDOMINIO.com/ \
  | grep -o '"@type":"Organization"[^}]*"name":"[^"]*"'
```

**Qué buscas.** El mismo nombre, escrito igual, en todas las páginas.

**Qué salió.** El mismo identificador llevaba dos grafías según la página, y el blog firmaba con
una tercera. Ahora el nombre vive en un solo archivo y el resto lo lee de ahí. De paso se
unificaron 80 apariciones en texto visible.

---

## 5. Ninguna página pública se queda sin datos estructurados

**Por qué.** Los datos estructurados son rellenarle la ficha a la máquina en vez de que tenga
que adivinarla leyendo tu diseño. Una página sin ellos no está prohibida: está pidiendo que la
interpreten a ojo.

```bash
curl -s https://TUDOMINIO.com/una-pagina \
  | grep -o 'application/ld+json' | wc -l
```

**Qué buscas.** Al menos uno por página pública. Y que los tipos tengan sentido: una ficha de
producto no es un artículo.

**Qué salió.** Cinco páginas no tenían nada. No había ni un `FAQPage` ni un `BreadcrumbList` en
todo el sitio.

---

## 6. El marcado no miente

**Por qué.** Ésta es la que más gente se salta, y es la que te puede costar una penalización.
Declarar en el marcado preguntas y respuestas que **no están visibles en la página** es
exactamente lo que las directrices llaman contenido engañoso.

**Cómo.** Coge cada pregunta que declaras en el `FAQPage` y búscala en el texto visible de esa
misma página. Si no está, sobra en el marcado.

**Qué buscas.** Cero preguntas y cero respuestas declaradas que no se puedan leer en la página.

**Qué salió.** De 13 preguntas declaradas en una de las páginas: 0 que no estuvieran visibles.
Es una comprobación que se pasa o se suspende, no hay término medio.

---

## 7. El contenido llega en el HTML, sin ejecutar JavaScript

**Por qué.** Ésta es la que de verdad decide si existes. Muchos rastreadores no ejecutan tu
JavaScript, o lo ejecutan mucho más tarde. Si tu texto aparece solo después de hidratar, para
ellos tu página está vacía por muy bien que se vea en tu navegador.

```bash
curl -s https://TUDOMINIO.com/una-pagina \
  | sed 's/<script[^>]*>.*<\/script>//g; s/<[^>]*>/ /g' \
  | tr -s ' \n' ' ' | head -c 2000
```

**Qué buscas.** Que salga tu texto de verdad. Si sale un marcador de posición, o el mismo texto
en todas tus páginas, tienes un problema — y no es de contenido.

**Qué salió.** Los ocho titulares por sector existían en el código desde siempre, pero el bloque
que los pinta se cargaba sin renderizado en servidor: al HTML iba su marcador genérico, y el
titular real solo aparecía tras la hidratación. Es decir, nunca para quien lee el HTML.

---

## 8. Cada página tiene un H1 propio y distinto

**Por qué.** El H1 es la respuesta corta a «¿de qué va esto?». Ocho páginas con el mismo H1 son,
para una máquina, ocho copias de la misma página.

```bash
curl -s https://TUDOMINIO.com/una-pagina | grep -o '<h1[^>]*>[^<]*'
```

**Qué buscas.** Uno por página, distinto de los demás, y **con las tildes puestas**: la
ortografía cuenta cuando lo que te lee es un modelo de lenguaje.

**Qué salió.** Ocho titulares de sector, todos distintos entre sí y del de la portada. Y 23 de
23 páginas públicas limpias de faltas después de reponer 242 tildes y 65 signos de apertura.

---

## 9. Todas las entradas a tu dominio acaban en el mismo sitio, con certificado válido

**Por qué.** Si `www` no resuelve o sirve un certificado caducado, la mitad de quien te enlaza y
buena parte de quien te rastrea se queda fuera antes de leer una sola línea. Y no te enteras,
porque tú entras siempre por la dirección buena.

```bash
for d in TUDOMINIO.com www.TUDOMINIO.com; do
  for p in http https; do
    printf '%-32s ' "$p://$d"
    curl -s -o /dev/null -L -w '%{http_code} -> %{url_effective}\n' "$p://$d" || echo "FALLA"
  done
done
```

**Qué buscas.** Las cuatro (o seis, si tienes más dominios) acaban en la misma dirección
canónica, con `https` y sin error de certificado.

**Qué salió.** Y aquí me equivoqué de diagnóstico dos veces, que es la parte útil: el dominio
`www` servía un certificado caducado y di por hecho que había que renovarlo. **No estaba
asignado a ningún proyecto**, así que no había nada a lo que emitirle certificado. Y la
redirección al dominio canónico llevaba escrita en el código todo el tiempo sin ejecutarse nunca:
la conexión moría antes, en el saludo TLS. El código estaba bien; faltaba la asignación.

---

## La tabla

Lo que salió al pasar las nueve contra producción, después de arreglarlo:

| Comprobación | Resultado |
| --- | --- |
| URLs del sitemap | 33, todas 200, ninguna redirige |
| Canonical propio | Las 9 páginas que decían ser la portada declaran la suya |
| Rastreadores de IA | 15 apartados; ninguno bloqueado, ninguno con menos protecciones |
| Nombre de marca | Uno solo, en las 8 páginas comprobadas |
| Datos estructurados | Ninguna página pública sin ellos |
| El marcado no miente | 0 preguntas o respuestas declaradas que no estén visibles |
| Contenido en el HTML | Presente sin ejecutar JavaScript |
| H1 por página | Distintos, y con tildes |
| Entradas al dominio | Las seis acaban en el canónico, con certificado válido |

---

## Lo que esto no arregla, y conviene saberlo antes de empezar

Ninguna de las nueve hace que una IA te recomiende. Lo único que consiguen es que **pueda**
hacerlo: que te encuentre, te entienda y no se invente lo que haces.

Y no cambia nada en el mismo segundo. Un asistente no relee internet cada minuto — que un
contenido nuevo entre puede tardar semanas.

Lo que de verdad decide si te mencionan es que lo que vendes sea bueno y haya alguien contándolo.
Esto solo se asegura de que la máquina se entere.

---

*Kata Ivanovych · [kata.ianexora.com](https://kata.ianexora.com) — si aplicas esto a tu negocio y
sale algo raro, respóndeme al correo con el que te llegó esto y lo miro.*
