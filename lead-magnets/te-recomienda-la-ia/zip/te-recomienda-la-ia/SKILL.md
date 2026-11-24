---
name: te-recomienda-la-ia
description: Mide cada mes si ChatGPT, Gemini y Perplexity nombran tu negocio y cómo cambia tu nota de recomendación. Úsala cuando preguntes «¿me recomienda ChatGPT?», «no salgo en la IA», «qué dice Perplexity de mi negocio» o «cada mes».
license: MIT
metadata:
  author: Kata Ivanovych
  version: "1.0.0"
---

# ¿Te recomienda la IA?

Mide cada mes si ChatGPT, Gemini y Perplexity nombran tu negocio en preguntas reales de compra. Registra los resultados para comparar meses.

🔀 Dos preguntas distintas:
- ¿Puede una IA leer mi web? Compruébalo con la skill gratuita [Visibilidad en IA](https://kata.ianexora.com/marketplace/visibilidad-en-ia).
- ¿Me recomienda la IA? Mide si te nombra con esta skill.
- Primero que pueda leerte; luego, medir si te nombra.

## 🔁 Flujo

1. **Reúne los datos del negocio.** Pide el nombre exacto y sus variantes, sector, ciudad y zona, servicio estrella, tres competidores que ya conoce y web. Si existe `perfil-negocio.md` (de la skill «empezar»), léelo primero y confirma los datos con la persona.
2. **Fija diez preguntas una sola vez.** Copia `assets/preguntas.plantilla.md` como `preguntas.md` y rellénala. Usa [references/preguntas-por-sector.md](references/preguntas-por-sector.md) para completar los campos y guardar los textos exactos. No los cambies entre meses: si cambian, la comparación se rompe y debes decirlo en el informe.
3. **Consulta cada asistente.** Pregunta a ChatGPT, Gemini y Perplexity. Cada pregunta va en un chat nuevo, temporal o de incógnito, o sin sesión cuando se pueda. Hazlo el mismo día, sin repreguntas, y copia la respuesta completa. Si tienes herramienta de navegador, puedes hacerlo; si no, entrega las preguntas una a una y pide que te peguen las respuestas. Nunca inventes ni simules una respuesta: deja vacía la que no hayas obtenido y cuenta que falta.
4. **Registra las respuestas.** Copia `assets/registro-recomendaciones-ia.plantilla.csv` como `registro-recomendaciones-ia.csv`. El script acepta CSV separado por comas o punto y coma; escribe «si/sí/no» en cualquier combinación de mayúsculas y minúsculas. Añade una fila por mes, asistente y pregunta. Sigue [references/registro.md](references/registro.md): marca mención, posición, competidores y dominios citados. P10 comprueba exactitud de los datos, no puntúa. La nota de recomendación mide si te nombran; no mide si la web puede leerse. La primera línea del CSV debe ser exactamente:

   ```csv
   mes,fecha,asistente,pregunta_id,pregunta,mencionado,posicion,competidores,fuentes,datos_correctos,notas
   ```

5. **Calcula el resultado.** Ejecuta:

   ```bash
   python3 scripts/puntuar.py registro-recomendaciones-ia.csv --negocio "NOMBRE" --salida informe-AAAA-MM.md
   ```

6. **Entrega el informe.** Sigue el formato «Cómo contarlo» de abajo. Incluye el cambio frente al mes anterior, resultado por asistente, competidores que más aparecen y fuentes citadas cuando el negocio no aparece. Si no hay comparación válida, explícalo.

## 📊 Cómo se puntúa

Cada pregunta puntúa de 0 a 3; P10 comprueba los datos y no puntúa. Las respuestas no obtenidas se dejan vacías y no entran en el cálculo.

| Puntos | Qué significa |
|---|---|
| 0 | El negocio no aparece en la respuesta. |
| 1 | Aparece, pero no está entre los tres primeros; también si no se puede determinar su posición. |
| 2 | Aparece en segundo o tercer lugar. |
| 3 | Aparece en primer lugar o es el único recomendado. |

La nota de recomendación final se expresa sobre 100. Estas son sus cuatro bandas:

| Puntuación | Banda |
|---|---|
| 0–19 | Invisible |
| 20–49 | Aparece a veces |
| 50–79 | En la conversación |
| 80–100 | Referencia |

## 🗣️ Cómo contarlo

Escribe el informe para la persona dueña del negocio, con palabras sencillas y sin tecnicismos. Empieza con una sola frase que diga la nota de recomendación y la banda. Después cuenta qué cambió frente al mes anterior; si no hay una comparación válida, dilo claramente. Termina con cinco arreglos concretos basados en [references/arreglos.md](references/arreglos.md): cada uno debe nombrar la señal observada y explicar qué puede hacer la persona para mejorarla. No uses «GEO» ni «LLM» sin explicarlo.

## 🚫 Lo que no hace

No promete que el negocio vaya a aparecer. Las respuestas varían de un día a otro; importa más la tendencia de varios meses que un número aislado. No consulta APIs de pago, no publica ni envía nada.

## ⚙️ Requisitos

Python 3.9 o posterior; no hace falta instalar nada (solo usa la biblioteca estándar). En Windows, el comando puede ser `python` o `py` en vez de `python3`. Ejecuta el script desde la carpeta de la skill. Para ver la ayuda: `python3 scripts/puntuar.py --help`.
