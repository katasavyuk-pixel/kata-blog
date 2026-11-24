---
name: auditoria-visibilidad-ia
description: Mide si ChatGPT, Gemini y Perplexity recomiendan tu negocio y cómo cambia la visibilidad cada mes. Úsala cuando preguntes «¿me recomienda ChatGPT?», «no salgo en la IA», «auditoría de visibilidad en IA», «qué dice Perplexity de mi negocio» o «cada mes».
license: MIT
metadata:
  author: Kata Ivanovych
  version: "1.0.0"
---

# Auditoría de visibilidad en IA

Mide si ChatGPT, Gemini y Perplexity recomiendan tu negocio en preguntas reales de compra. Registra los resultados para comparar meses. No confundas esta medición con comprobar si una IA puede leer tu web.

## Flujo

1. **Reúne los datos del negocio.** Pide el nombre exacto y sus variantes, sector, ciudad y zona, servicio estrella, tres competidores que ya conoce y web. Si existe `perfil-negocio.md` (de la skill «empezar»), léelo primero y confirma los datos con la persona.
2. **Fija diez preguntas una sola vez.** Usa `references/preguntas-por-sector.md`, completa los campos y guarda los textos exactos en `preguntas.md`. No los cambies entre meses: si cambian, la comparación se rompe y debes decirlo en el informe.
3. **Consulta cada asistente.** Pregunta a ChatGPT, Gemini y Perplexity. Cada pregunta va en un chat nuevo, temporal o de incógnito, o sin sesión cuando se pueda. Hazlo el mismo día, sin repreguntas, y copia la respuesta completa. Si tienes herramienta de navegador, puedes hacerlo; si no, entrega las preguntas una a una y pide que te peguen las respuestas. Nunca inventes ni simules una respuesta: deja vacía la que no hayas obtenido y cuenta que falta.
4. **Registra las respuestas.** Añade una fila por mes, asistente y pregunta en `registro-visibilidad-ia.csv`. Sigue `references/registro.md`: marca mención, posición, competidores y dominios citados. P10 comprueba exactitud de los datos, no puntúa.
5. **Calcula el resultado.** Ejecuta:

   ```bash
   python3 scripts/puntuar.py registro-visibilidad-ia.csv --negocio "NOMBRE" --salida informe-AAAA-MM.md
   ```

6. **Entrega el informe.** Incluye puntuación de 0 a 100 y banda, cambio frente al mes anterior, resultado por asistente, competidores que más aparecen, fuentes citadas cuando el negocio no aparece y cinco arreglos concretos basados en `references/arreglos.md`. Si no hay comparación válida, explícalo.

## Lo que no hace

No promete que el negocio vaya a aparecer. Las respuestas varían de un día a otro; importa más la tendencia de varios meses que un número aislado. No consulta APIs de pago, no publica ni envía nada.
