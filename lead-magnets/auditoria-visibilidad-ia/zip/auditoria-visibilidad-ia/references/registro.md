# Registro de respuestas

Guarda una fila por combinación de mes, asistente y pregunta. Usa UTF-8, CSV separado por comas y comillas CSV estándar. No cambies las preguntas al repetir la medición.

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

La plantilla CSV está en `assets/registro-visibilidad-ia.plantilla.csv`. Si trabajas en papel o en una hoja, puedes usar esta tabla equivalente:

| mes | fecha | asistente | pregunta_id | pregunta | mencionado | posicion | competidores | fuentes | datos_correctos | notas |
|---|---|---|---|---|---|---|---|---|---|---|
| AAAA-MM | AAAA-MM-DD | chatgpt / gemini / perplexity | P01–P10 | texto exacto | si / no / vacío | entero / vacío | nombre\|nombre | dominio\|dominio | si / no / parcial / vacío | nota |
