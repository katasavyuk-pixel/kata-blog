# Cómo interpretar la puntuación

La puntuación se calcula con P01–P09 para ChatGPT, Gemini y Perplexity: 27 respuestas previstas por mes. P10 es una comprobación de datos y no puntúa.

| Resultado de cada respuesta | Puntos |
|---|---:|
| No te menciona | 0 |
| Te menciona sin posición o en posición 4 o posterior | 1 |
| Te coloca en posición 2 o 3 | 2 |
| Te coloca en posición 1 o eres el único recomendado | 3 |

**Puntuación = redondeo de (100 × puntos obtenidos / (3 × respuestas obtenidas)).** Las respuestas que faltan no bajan el resultado: reducen la confianza y se muestran como «N de 27». Si no hay respuestas obtenidas, el resultado es 0/100 y debe leerse como falta de datos, no como una medición concluyente.

| Puntuación | Banda |
|---:|---|
| 0–19 | Invisible |
| 20–49 | Aparece a veces |
| 50–79 | En la conversación |
| 80–100 | Referencia |

El informe también muestra **presencia**, porcentaje de respuestas obtenidas que te mencionan; **posición media** entre las menciones con posición registrada; y la puntuación por asistente, calculada con su propio denominador de respuestas obtenidas.

Solo compara dos meses si coinciden los textos de P01–P09 y los asistentes consultados. Si cambia una pregunta, los asistentes o su cobertura, el informe debe decir «no comparable». Un homónimo no cuenta como mención: confirma que la recomendación se refiere al negocio correcto.

## EJEMPLO: cálculo

Datos inventados: en cuatro respuestas obtenidas, el negocio consigue posición 1 (3 puntos), posición 3 (2), posición 5 (1) y no aparece (0). Total: 6 puntos de un máximo de 12. Cálculo: redondeo de 100 × 6 / 12 = **50/100**, banda «En la conversación». Las 23 respuestas pendientes no entran en el denominador; la confianza es baja y se informa como «4 de 27».
