# Diseño congelado para el futuro blog personal

Esta rama (`design/blog-personal-v1`) y la etiqueta anotada del mismo nombre guardan el diseño que tenía
`kata.ianexora.com` el 26 de noviembre de 2026, justo antes de migrar el blog de IA a
`ianexora.com/blog` con el diseño de la web de NBI (Nexora Business Intelligence).

Sirve de punto de partida para el futuro blog personal de Kata (trading y desarrollo personal).
Nada de esta rama se despliega: es solo una referencia. Base: `main` @ commit `a89ab5e`.

La especificación completa del sistema (tokens, escala tipográfica, reglas) está en [`DESIGN.md`](./DESIGN.md).

## Qué incluye

| Pieza | Descripción | Rutas |
|---|---|---|
| Tema y tokens | Paleta cálida (fondo `#FBF9F8`, tinta `#140A0D`, acento rojo `#E11423`), bordes, foco, variables CSS y `@theme inline` de Tailwind v4 | `src/app/globals.css`, `DESIGN.md` (frontmatter) |
| Tipografías | Newsreader (lectura y titulares, eje óptico), Schibsted Grotesk (interfaz), JetBrains Mono (datos); autoalojadas con `next/font` | `src/app/layout.tsx`, mapeo en `src/app/globals.css` |
| Estructura del sitio | Cabecera, menú, pie y envoltorio común | `src/components/layout/header.tsx`, `nav.tsx`, `footer.tsx`, `site-chrome.tsx` |
| Portada | Hero, mural, filtro de noticias, portada por «lentes» | `src/app/page.tsx`, `src/components/home/*` (incl. `mural.css`), `src/components/portada/*` (incl. `portada.css`) |
| Primitivas de UI | Botón, contenedor, dato, eyebrow, iconos, prosa, retrato, cabecera de sección, JSON-LD | `src/components/ui/*` |
| Artículo | Índice, barra de lectura, bio de autor, compartir, relacionados, cierre, FAQ | `src/components/blog/*`, `src/components/mdx/*` |
| Otras secciones | Bitácora, marketplace, newsletter (incl. `secuencia.css`), herramientas, vídeo, curso | `src/components/{bitacora,marketplace,newsletter,tools,video,course}/*` |
| Movimiento y efectos | Proveedor de movimiento (respeta `prefers-reduced-motion`), campo de partículas | `src/components/motion/motion-provider.tsx`, `src/components/effects/particle-field.tsx` |
| Imágenes de marca | Favicon e icono, retratos, imagen OG generada | `src/app/favicon.ico`, `src/app/icon.svg`, `public/kata/retrato.webp`, `public/kata/retrato-cara.webp`, `src/app/opengraph-image.tsx` |
| Recursos gráficos | Portadas y capturas de artículos (contenido del blog de IA; sustituir en el blog personal) | `public/covers/*`, `public/capturas/*` |
| Configuración de marca | Nombre, dominio, textos de cabecera y navegación | `src/config/site.ts` |

## Cómo reutilizarlo

1. Crear un repo nuevo para el blog personal a partir de esta etiqueta (`git checkout design/blog-personal-v1`).
2. Quitar el contenido de IA de NBI (`content/`, `public/covers`, `public/capturas`, marketplace, lead magnets) y la integración con Supabase si no hace falta.
3. Cambiar `src/config/site.ts` (nombre, dominio, descripción) antes del primer despliegue.

No incluye secretos ni variables de entorno: esas viven solo en Vercel.
