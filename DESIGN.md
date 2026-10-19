---
name: "Kata Ivanovych — lectura en claro"
description: "Noticias, herramientas y skills de IA para un negocio pequeño."
colors:
  bg: "#FBF9F8"
  surface: "#F2EDEB"
  surface-2: "#EEE7E4"
  panel: "#FFFFFF"
  fg: "#140A0D"
  muted: "#5E4B50"
  faint: "#76636A"
  chrome: "#3F3236"
  accent: "#E11423"
  accent-ink: "#C40F1F"
  accent-strong: "#7A0C18"
  on-accent: "#FFFFFF"
  amber: "#8A5A12"
  border: "#E3D9D6"
  ring: "#E11423"
  danger: "#B3261E"
typography:
  h1-home:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.375rem, 1.375rem + 3.3vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.04
  h1:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.375rem, 1.375rem + 3.4vw, 4.125rem)"
    fontWeight: 500
    lineHeight: 1.03
  lede:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.3125rem, 0.9375rem + 0.75vw, 1.5625rem)"
    lineHeight: 1.42
  h2:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.5625rem, 1.0625rem + 1.1vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.15
  h3:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.125rem, 0.97rem + 0.4vw, 1.28125rem)"
    fontWeight: 400
    lineHeight: 1.64
    measure: "66ch"
  interface:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.8125rem"
  h2-section:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.875rem, 1.35rem + 1.9vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.08
  numeral-xl:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.75rem, 1.9rem + 3.4vw, 4.75rem)"
    fontWeight: 500
    fontVariantNumeric: "lining-nums tabular-nums"
  numeral:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2rem, 1.5rem + 1.5vw, 2.5rem)"
    fontWeight: 500
    fontVariantNumeric: "lining-nums"
layout:
  container: "1152px, gutter 20px (32px ≥ 640px)"
  reading-column: "66ch, centred in the article column"
  breakout: "6rem per side, capped at the column width (container query)"
  sections: "56px vertical (80px ≥ 640px); hierarchy by heading size, bands and one red band"
---

# Sistema de diseño — Kata Ivanovych

**Qué es:** un sitio para leer. Conclusión primero: el h1, la respuesta corta y lo que te llevas, y el texto empieza dentro de la primera pantalla de un portátil. Piezas interactivas que rompen la columna y fichas con datos. No es una revista cinematográfica: nada de grano, viñeta, halo rojo ni titulares condensados.

**Rediseño del 2026-10-14.** Kata eligió en el lienzo de Claude Design «V1 · Conclusión primero» en claro, frente a otras dos estructuras y al tema oscuro. Leer en claro es para lo que existe este sitio: el negro cálido queda como tinta (y como fondo del vídeo) y el rojo sigue siendo el único color. La portada, los listados, el cierre del artículo y las piezas interactivas se rehicieron por familias el mismo día (#60, #63–#66).

## Tokens

Todos en `src/app/globals.css` (`@theme`). Nunca un hex en JSX.

- Superficies: `bg` (papel cálido), `surface`, `surface-2`, `panel` (blanco: una puerta de la home o el marco de una pieza, lo que se toca). Texto: `fg` (tinta), `muted`, `faint`, `chrome`. Rojo: `accent` (superficie, 4.63:1 — nunca texto pequeño), `accent-ink` (texto, 5.82:1), `accent-strong`, `on-accent`. Estado y aviso de IA: `amber` (5.63:1 sobre `bg`, 5.09:1 sobre `surface`; vale para texto). Líneas: `border`, `ring`. `danger`.
- Todo token de texto pasa 4.5:1 sobre `bg` y sobre `surface` (los valores, en `globals.css`).
- Los bloques de código usan el tema `github-light` (`velite.config.ts`).
- Los nombres antiguos (`salmon`, `dark-*`, `cat-*`, `glow-*`, `eyebrow`, `gold`…) se borraron en la fase 5: no existen como tokens.
- Sin interletrado en etiquetas: van en minúscula y en la letra de interfaz. `tracking-label` se borró el 2026-10-14, con la última etiqueta mono. No hay `tracking-[…]` en el código.

## Tipografía

Tres familias, tres trabajos (`src/app/layout.tsx`, `next/font`, variables):

- **Newsreader** (opsz 6–72, con itálica): texto de lectura, h1, h2 y la respuesta corta (`text-lede`).
- **Schibsted Grotesk**: interfaz — nav, botones, formularios, etiquetas, metadatos, h3 y menores. Las etiquetas nuevas van en esta, en minúscula y sin interletrado: el mono como etiqueta es de la maquetación anterior.
- **JetBrains Mono**: código, comandos y, en las piezas, lo que se le escribe al modelo (el prompt, el contexto, los tokens). Siempre con cifras tabulares (`.font-mono` lo aplica). Las cifras de una pieza van en la letra de interfaz (`tabular-nums` solo si no llevan punto de millar ni decimal: en Schibsted Grotesk la cifra tabular le da al punto el ancho de un dígito) y el resultado grande, en la de lectura (`font-display lining-nums`).

Escala: `text-h1-home`, `text-h1`, `text-h2-section` (cabeceras de sección en home e índices), `text-h2`, `text-h3`, `text-label`, `text-numeral`, `text-numeral-xl` (el resultado de una pieza, los recuentos de sección) (ver frontmatter). Cuerpo de 18 px en el móvil a 20,5 px en un portátil, interlineado 1.64; medida 66ch. `.prose` toma estos valores.

## Componentes

- **`Hero`** (`components/home/hero.tsx`): h1 = `siteConfig.home.titular` (lo que el lector puede hacer aquí), su línea y la tarjeta de la newsletter con el formulario. Es la sección `#newsletter`, la única con formulario en la home. Sin retrato ni promesa personal desde el 2026-10-14: los dos están en /sobre-mi.
- **Logo de skill** (`components/marketplace/logo-skill.tsx`, `config/logos.ts`): el glifo en blanco sobre el color propio de cada skill, en una baldosa con las esquinas redondeadas (22 %). `tests/logos.test.ts`: toda skill instalable tiene logo, el blanco pasa 4,5:1 y ningún color está a menos de 25° del cian de NBI o del ámbar de MaitreAI.
- **Retrato** (`components/ui/retrato.tsx`): `RETRATO` (fichero, tamaño, alt «Kata Ivanovych») y `RetratoMini` (firma del artículo). Lo usan la home, el artículo y /sobre-mi.
- **`Cover`** (`components/content/cover.tsx`): la portada documental 16:9 de un post, con su `coverAlt`. Nunca en noticias.
- **`SectionHead`** (`components/ui/section-head.tsx`): regla roja de 3 px a todo lo ancho, h2 a `text-h2-section` en la letra de lectura, una línea debajo, y el recuento —solo si sale del código— en palabras, al lado. Sin numeral grande en mono (2026-10-14). `tone="rojo"` para la banda roja.
- **`Ficha`** (`components/sistema/ficha.tsx`): la ficha de un sistema. Portada si el listado pasa `post`; píldora de `Estado` (icono + etiqueta + «desde …» sobre fondo tintado); qué hace; **«Qué se rompió» como el bloque destacado** (superficie roja tenue — es lo que nadie más publica); coste en una fila compacta, o «Coste sin medir aún» en pequeño y apagado; recurso. Los datos salen de `config/library.ts`; `assertEvidencia` y `assertCosteMensual` rompen la build si falta una fuente o una fecha. «Nada documentado todavía» es una respuesta válida; una avería inventada no.
- **`Dato`** (`components/ui/dato.tsx`): un número con `fuente` obligatoria (lanza si falta) y `comprobado` opcional.
- **Tarjetas por función** (`components/content/`): `SistemaCard` (portada + panel de datos para un sistema sin ficha), `NotaCard` (portada, kicker, título, dek, fecha; `cover={false}` en listas densas), `LeccionRow` (fila numerada, solo en /empieza-aqui), `NoticiaRow` (una línea densa, nunca imagen).
- **Kit de piezas** (`components/pieza/`, fase 4): `Pieza` (marco + contexto), `Puntuador modelo` (filas × criterios → orden; `modo="lista"` = checklist), `Calculadora modelo`, `Comparador`/`Lado` (pestañas con radios + CSS, las dos caras en el HTML), `PasoAPaso`/`Paso` (todos los pasos en el HTML; con JS, uno a la vez), `Revelar` (`<details>` nativo), `Correo` (correo simulado, siempre etiquetado), `EnviarResultado magnet` (el formulario de siempre con el estado de la pieza como `payload`). Los modelos viven en `lib/piezas/registry.ts` y se nombran por id desde el MDX. Cada pieza se pinta en servidor en su estado «Ejemplo», con resultado y fórmula visibles; los controles miden 44 px, tienen foco visible y cambian sin animación bajo `prefers-reduced-motion`.
- **El lenguaje de la newsletter** (2026-10-15, N1 y N2, «me gusta hasta para el blog»): bloques bajo una regla roja de 3 px con su etiqueta en versalitas rojas, la caja de papel `surface` para el resumen («En un minuto» en la edición, «Lo que te llevas» en el artículo) y `Secuencia` (`components/newsletter/secuencia.tsx`, también widget MDX): los pasos de un sistema con su fallo marcado con ✕. En reposo es el diagrama completo, también sin JS; el punto rojo solo recorre los pasos al pulsar «Ver el recorrido» (control de 44 px, sin botón con movimiento reducido). En el correo, la misma secuencia va como GIF.
- **`WidgetFrame`** (`components/mdx/widgets/widget-frame.tsx`): el marco de los widgets del curso; desde la fase 4 envuelve el mismo `Marco` que `Pieza`. Desde el 2026-10-14 el marco es un panel blanco (`bg-panel`) sobre el papel, como las puertas de la home: dice «esto se toca». Título en Schibsted Grotesk seminegrita con el triángulo rojo dibujado, controles de 44 px con `rounded-sm`, rojo en los controles, ámbar solo en avisos; la barra de título salta de línea en un móvil. `supuestos` pinta la línea «Supuestos». Todos los deslizadores son el mismo `.deslizador` (`Param` y la calculadora). Dentro de `.prose` puede ensancharse hasta `--breakout` por lado.
- **Cabecera / pie** (`components/layout/`): Schibsted Grotesk, una fila, los mismos enlaces de `config/site`. El pie pinta el formulario solo donde la página no tiene el suyo (`hasOwnSignupForm`).
- **Portada** (`components/portada/portada.tsx`): desde el 2026-10-14, el mapa de lo que el lector puede hacer, en cuatro puertas (paneles `bg-panel`): Noticias (la del día y los breves con filtro por tema), Marketplace (las skills con su logo), Herramientas («No me da la vida» funcionando con su ejemplo, y enlaces a las demás) y Lecturas (lo último firmado, por su entradilla). Una puerta sin nada dentro no se pinta. La lente se fue a /noticias, junto a la noticia protagonista.
- **Lente** (`components/portada/lente-selector.tsx` + «The reader's lens» en globals.css): tres radios reales dibujados como opciones de 44 px; la elegida, rojo de superficie con texto blanco. Las tres lecturas están en el HTML: de 1024 px en adelante van en columnas, la del lector en `fg` con regla roja y las otras dos en `muted` (legibles, no apagadas con opacidad); más estrecho se ve solo la del lector. Cambia de color en 200 ms, como respuesta.
- **Fila del flujo** (`components/content/flujo-row.tsx`): la pieza en el archivo. El formato en rojo delante de todo (es lo que la fila viene a decir), el tema, el título en Literata, la entradilla y la fecha; la portada al lado desde tableta y fuera en el móvil. Un sistema lleva la misma fila que una nota: su ficha vive en `/sistemas`.
- **Artículo** (`app/blog/[slug]/page.tsx`, conclusión primero): una línea con firma (retrato pequeño + autor, o «Noticias en automático» + aviso de IA), formato, fecha y lectura → h1 → **la respuesta corta** (`respuesta` en el frontmatter, bajo una regla roja; sin ella, el `dek` en `text-lede`) → **lo que te llevas** (`te_llevas`, hasta tres líneas; sin ellas, nada) → la caja de fuente si es una noticia protagonista → el vídeo si lo hay → cuerpo en 66ch → ficha, «Lo que uso para esto», «A raíz de», «Lo que escribí a raíz de esto», preguntas, etiquetas y compartir → un solo cierre. Sin portada, sin índice y sin raíl lateral: empujaban la primera frase por debajo de la pantalla. `respuesta` y `te_llevas` las escribe quien firma la pieza, nunca un modelo. Las tablas del cuerpo van en una caja que se desplaza en horizontal (`components/mdx/mdx-content.tsx`): en un móvil no caben cuatro columnas y antes la última quedaba cortada.

## Reglas

1. **Nada antes del h1.** Ni pantallas de entrada, ni scrollytelling, ni mascotas, ni animaciones de revelado. La promesa es lo primero que ve un lector y lo primero que lee un rastreador.
2. **La pieza interactiva es contenido.** Va dentro de la columna de lectura y puede romperla; no es decoración ni portada.
3. **Estado = icono + etiqueta.** Iconos SVG dibujados (`components/ui/icon.tsx`, trazo 1.75 sobre 24): disco lleno en producción (rojo), medio disco en el taller / piloto (ámbar), aspa lo que se rompió. Nunca solo color, y nunca un carácter Unicode haciendo de icono.
4. **Un formulario por página.** `tests/arquitectura.test.ts` lo comprueba en las páginas, y `tests/formularios.test.ts` en el artículo entero: el cierre pone su formulario solo si el cuerpo no trae ya uno (`SuscripcionInline`, `EnviarResultado` o la calculadora en modo captura); si lo trae, enlaza a él.
5. **Una cifra lleva su fuente.** `Dato` lanza sin ella; `assertCosteMensual` rompe la build sin fecha de comprobación.
6. **Interfaz en Schibsted Grotesk, lectura en Newsreader, código en mono.** Las etiquetas (formato, tema, fecha, fuente, «Qué se rompió») van en Schibsted Grotesk, en minúscula y sin interletrado; el mono queda para código, comandos y lo que se le escribe al modelo. Las piezas interactivas siguen la misma regla desde el 2026-10-14. Un h3 nunca compite con el h2 de encima.
7. **Jerarquía, no líneas iguales.** Las secciones se distinguen por el tamaño de su cabecera (`text-h2-section`), por bandas `surface` alternas y por una sola banda roja por página. Sin cajas anidadas; sombras solo en menús y paneles flotantes.
8. **Movimiento solo como respuesta.** Nada se anima al entrar en pantalla; `prefers-reduced-motion` se respeta en globals.css. **Una excepción, decidida por Kata el 2026-10-15:** el mural de la portada (`components/home/mural.tsx`), tres columnas de tarjetas (noticias del día, skills, bitácora) que se desplazan solas junto al h1, nunca delante. Sale de lo publicado, se para con el ratón, con el foco del teclado y con un botón («Parar el movimiento», WCAG 2.2.2), y con movimiento reducido no se mueve. Ningún otro elemento del sitio se mueve solo.
9. **Esquinas rectas, un solo radio.** Paneles, tarjetas, marcos, avisos y bloques de código no llevan radio. Los controles (botón, campo, opción, casilla) llevan `rounded-sm` (4 px), y `rounded-full` queda para píldoras de estado, chips, puntos y el retrato pequeño. Nada mayor: `tests/diseno.test.ts` rompe la build con un `rounded-md` o superior. La única excepción es el logo de una skill (`.logo-skill`, 22 %), que se lee como el icono de una app.

## Piel A + B (2026-10-07)

«Sosa y aburrida» era el diagnóstico: blanco sobre negro y nada más. La piel cambia el peso, no el concepto.

- **A · Revista con cara.** El retrato del autor en la home (columna propia en escritorio, sobre un bloque rojo; pequeño junto a «Soy Kata» en el móvil), en la firma del artículo y en /sobre-mi. Las portadas documentales vuelven a las tarjetas de sistemas y notas y a la cabecera del artículo, siempre después del h1. Las noticias siguen sin imagen.
- **Rojo como superficie.** Una banda roja por página, como mucho (en la home: la cabecera de Sistemas), con texto blanco puro. El resto alterna `bg` / `surface`. Nunca un muro rojo.
- **Números grandes solo si existen.** Recuentos derivados del contenido (sistemas, lecturas, ediciones) en `text-numeral-xl`. Nada inventado.
- **B · Ensayo vivo.** Las notas 1–5 son controles segmentados: un grupo de radios dibujado como puntos (●●●○○), flechas del teclado, objetivos de 44 px, y arrastre con el puntero. El resultado son barras horizontales grandes que cambian de ancho con `transform` (260 ms), el primero en rojo con «1.º» grande en la letra de lectura, los demás apagados, y dos chips por fila (ámbar en el líder). La lista es de filas grandes con casilla SVG y un medidor por segmentos. La calculadora: el coste grande en la letra de lectura, deslizadores con chip de valor (que acepta el número exacto) y la fórmula visible.
- **Movimiento solo como respuesta** a lo que hace el lector (una barra que crece al cambiar una nota), 150–300 ms, color / opacidad / transform, apagado con `prefers-reduced-motion`.

## Copy

Español de España, primera persona del singular. Sin «somos / nuestro / la empresa», sin precios, sin cifras inventadas, sin cadencia fija («a la semana» solo detrás de «como mucho»), sin el léxico prohibido de VOZ.md. Los textos de identidad viven en `src/config/site.ts`; `tests/promesa.test.ts` vigila.
