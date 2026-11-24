# Lead magnet — «¿Te recomienda la IA?»

Skill descargable de medición mensual para saber si ChatGPT, Gemini y Perplexity nombran un negocio y seguir la tendencia.

| Pieza | Dónde vive | Cómo llega |
|---|---|---|
| **¿Te recomienda la IA?** (`te-recomienda-la-ia.zip`) | Bucket privado `lead-magnets`, ruta `te-recomienda-la-ia/te-recomienda-la-ia.zip`, fila `te-recomienda-la-ia` en `public.resources` | Formulario del artículo → doble opt-in → descarga en el correo confirmado, o desde `/herramientas`. |

## Qué contiene el zip

En la raíz del zip, `LEEME.txt` explica las tres formas de usar el recurso, la duración aproximada y que los ejemplos son inventados. La carpeta `te-recomienda-la-ia/` contiene:

- `SKILL.md`: flujo para preparar preguntas fijas, consultar asistentes, registrar respuestas y generar un informe.
- `references/preguntas-por-sector.md`: preguntas P01–P10 y variantes listas para adaptar a nueve sectores.
- `references/puntuacion.md`: rúbrica, bandas y ejemplo aritmético.
- `references/registro.md`: columnas CSV y modelo de tabla manual.
- `references/arreglos.md`: señales observadas y acciones concretas.
- `assets/registro-recomendaciones-ia.plantilla.csv`: cabecera para iniciar el registro.
- `assets/preguntas.plantilla.md`: hoja para conservar las diez preguntas exactas.
- `scripts/puntuar.py`: validador y calculador local que genera resumen JSON e informe Markdown.
- `ejemplos/registro-ejemplo.csv`: 60 filas de dos meses con datos inventados.
- `ejemplos/informe-ejemplo.md`: informe generado por el script a partir del CSV de ejemplo.

## Cómo reconstruir el zip

Desde la carpeta `zip/`:

```bash
cd zip && zip -q -r ../te-recomienda-la-ia.zip . -x '.*'
```

El zip es un artefacto, no se versiona en el repositorio.

## Publicar

El orden importa: primero el archivo y después la fila que activa su descarga.

1. Sube `te-recomienda-la-ia.zip` al bucket `lead-magnets`, en la ruta `te-recomienda-la-ia/te-recomienda-la-ia.zip`.
2. Ejecuta el bloque correspondiente de `supabase/seeds/resources.sql`.
3. Comprueba que `/herramientas` muestra el recurso y envía `POST /api/welcome-sequence/test` con `resource: te-recomienda-la-ia`; confirma el correo y abre la descarga desde el botón del email.

Al publicar la fila, este recurso pasa automáticamente a ser el «regalo de la semana»: `src/lib/regalo-semana.ts` elige la fila publicada más reciente.
