# Regalo de alta — «Recupera horas de tu semana con IA»

Lo que recibe **todo el que se suscribe** (Kata, 2026-10-16: «algo de alto valor que les sirva a
todos, tengan negocio o no»). Son dos piezas:

| Pieza | Dónde vive | Cómo llega |
|---|---|---|
| **La hoja de tu semana** (`hoja-de-tu-semana.xlsx`) | Bucket privado `lead-magnets`, fila `hoja-de-tu-semana` en `public.resources` | Botón firmado en el primer correo de bienvenida (`{{bloque_regalo}}`), para todos. También desde el formulario de `/herramientas/ficha-para-tu-ia` y desde `/herramientas`. |
| **Tu ficha para la IA** | Página pública `/herramientas/ficha-para-tu-ia`; el texto está en `src/config/regalo.ts` | Enlace en el mismo correo, en `/gracias` y en `/herramientas`. |

## La hoja

`generar_hoja.py` la genera entera. No se edita a mano: se cambia el script y se vuelve a generar.

```bash
python3 lead-magnets/recupera-horas/generar_hoja.py
python3 ~/.claude/skills/xlsx/scripts/recalc.py lead-magnets/recupera-horas/hoja-de-tu-semana.xlsx
```

`recalc.py` necesita Python 3.10 o superior y openpyxl. Tiene que acabar con `"total_errors": 0`.

- **Empieza aquí**: cómo se usa, los ajustes y qué hacer después.
  - Semanas al año: 45. Son 52 menos unas 4 de vacaciones y unas 3 de festivos.
  - Horas a la semana: 40.
  - Valor de la hora: vacío.
  - Qué significa «Casi toda», «La mitad», «Poco» y «Nada»: 80 %, 50 %, 20 % y 0 %.

  Todos son editables y llevan su explicación al lado. Son estimaciones para ordenar las tareas, no datos.
- **Tu semana**: 30 filas vacías, el resumen (horas al año, horas que devuelve la IA, semanas de
  trabajo y euros) y «Por dónde empezar» (las tres primeras).
- **Ejemplo**: una semana inventada, rotulada como tal.
  - Comprobado a mano el 2026-10-16: 337,5 h al año, 193,5 h que devuelve la IA y 3.645 €.
  - Las tres primeras: pasar datos, correos repetidos y resumir reuniones.

## Publicar (o republicar) la hoja

El orden importa: primero el archivo, luego la fila. Si la fila está publicada y el archivo no
existe, la descarga falla justo después de confirmar el correo. Mientras la fila no exista, el
correo no lleva el bloque del regalo: no promete nada que no pueda dar.

1. Sube `hoja-de-tu-semana.xlsx` al bucket `lead-magnets`, carpeta `hoja-de-tu-semana/`.
2. Ejecuta su bloque de `supabase/seeds/resources.sql` en el editor SQL del proyecto.
3. Comprueba que `/herramientas` la lista, y mándate la secuencia de prueba
   (`POST /api/welcome-sequence/test`).

## Dónde se pega la ficha

Comprobado en la ayuda oficial de OpenAI, Anthropic y Google. La fecha y los enlaces están en
`DONDE_SE_PEGA` (`src/config/regalo.ts`). `tests/regalo.test.ts` falla a los 120 días, para obligar
a revisarlo: los menús cambian a menudo.
