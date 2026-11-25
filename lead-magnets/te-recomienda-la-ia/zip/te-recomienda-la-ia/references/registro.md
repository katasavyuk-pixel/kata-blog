# Registro de respuestas

Guarda una fila por combinación de mes, asistente y pregunta. Usa UTF-8, CSV separado por comas y comillas CSV estándar. No cambies las preguntas al repetir la medición.

El texto completo de cada respuesta no va en el CSV: se guarda en `respuestas/AAAA-MM/<asistente>-Pxx.md` (por ejemplo, `respuestas/2026-11/chatgpt-P01.md`) y el CSV solo anota esa ruta en `archivo_respuesta`. Así se evitan dos límites de Excel: una celda no puede superar 32.767 caracteres y los saltos de línea de una respuesta larga suelen romperse al abrir o volver a guardar la hoja.

| Columna | Contenido |
|---|---|
| `mes` | Mes de medición, `AAAA-MM`. |
| `fecha` | Día de la consulta, `AAAA-MM-DD`. |
| `asistente` | `chatgpt`, `gemini` o `perplexity`. |
| `pregunta_id` | `P01` a `P10`. |
| `pregunta` | Texto literal que enviaste. |
| `mencionado` | `si` o `no`; vacío si no obtuviste respuesta. |
| `posicion` | Entero si puedes identificar la posición; vacío si no se ordenó o no aparece. |
| `competidores` | Nombres separados por `|`. |
| `fuentes` | Dominios citados, separados por `|`, sin protocolo si es posible. |
| `datos_correctos` | Solo P10: `si`, `no` o `parcial`; vacío en P01–P09. |
| `notas` | Contexto breve, incluida la falta de respuesta. |
| `archivo_respuesta` | Ruta al archivo con el texto completo, relativa a la carpeta del CSV o de la skill; vacía si no hubo respuesta. |

La plantilla CSV está en `assets/registro-recomendaciones-ia.plantilla.csv`. Un CSV anterior, sin la columna `archivo_respuesta`, sigue siendo válido para calcular la nota. Para volver a puntuar el histórico hace falta el texto (el archivo o, si ya existía, una columna `respuesta`). Si trabajas en papel o en una hoja, puedes usar esta tabla equivalente:

| mes | fecha | asistente | pregunta_id | pregunta | mencionado | posicion | competidores | fuentes | datos_correctos | notas | archivo_respuesta |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AAAA-MM | AAAA-MM-DD | chatgpt / gemini / perplexity | P01–P10 | texto exacto | si / no / vacío | entero / vacío | nombre\|nombre | dominio\|dominio | si / no / parcial / vacío | nota | respuestas/AAAA-MM/asistente-Pxx.md |
