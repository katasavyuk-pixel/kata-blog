---
name: acta-de-reunion
description: 'Convierte la transcripción o las notas de una reunión de trabajo en un acta revisable: puntos tratados, acuerdos, tareas con quién y para cuándo, lo pendiente de decidir y una lista de lo que hay que revisar, sin inventar responsables, fechas ni cifras. Úsala cuando pidan "haz el acta", "acta de la reunión", "resume esta reunión", "saca las tareas de esta transcripción", "minuta" o "correo de seguimiento de la reunión".'
license: MIT
metadata:
  author: Kata Savyuk
  version: "1.0.0"
---

# Acta de reunión

Entrega el borrador de un acta que una persona revisa antes de enviar. Nunca lo presentes como acta definitiva: la aprueba quien la firma.

## Flujo

```
- [ ] 1. Reunir los datos de la reunión
- [ ] 2. Leer la transcripción entera
- [ ] 3. Redactar el acta con la plantilla
- [ ] 4. Hacer la lista «Para revisar»
- [ ] 5. Ofrecer el correo de seguimiento
```

### 1. Reunir los datos

Pide lo que falte, en una sola pregunta: nombre o motivo de la reunión, fecha, lugar o plataforma, asistentes bien escritos, orden del día si lo había y quién redacta. Si la persona no lo sabe, sigue y marca el hueco con [REVISAR].

### 2. Leer la transcripción entera

Antes de escribir, localiza la ronda de cierre si la hay (el repaso final de acuerdos). Lo que se dijo en ella manda sobre lo anterior; si choca, márcalo con [REVISAR].

Si la transcripción pasa de una hora, primero haz la lista de acuerdos y tareas con la frase donde se dice cada uno, y redacta después.

### 3. Redactar el acta

Usa [references/plantilla-acta.md](references/plantilla-acta.md). Reglas, sin excepciones:

- No inventes nombres, fechas, cifras ni responsables.
- Una tarea solo entra si alguien la aceptó. Sin quién: [SIN RESPONSABLE]. Sin cuándo: [SIN FECHA].
- Lo que quedó en propuesta, duda o «lo miramos» va en «Pendiente de decidir», nunca en «Acuerdos».
- Si una palabra, un nombre o un número no se entiende: [REVISAR: lo que dudas].
- Copia cifras y fechas tal como aparecen. No redondees ni calcules.
- Sin citas literales y sin «X dijo». El acta recoge lo que se decidió.
- Deja fuera bromas, conversaciones paralelas y lo que alguien pidió que no constara.
- No añadas conclusiones, recomendaciones ni opiniones.

### 4. La lista «Para revisar»

Al final, todas las marcas [REVISAR], [SIN RESPONSABLE] y [SIN FECHA], en orden. Si no hay ninguna, dilo, y recuerda que la persona tiene que comprobar igualmente nombres, cifras y acuerdos.

### 5. El correo de seguimiento

Ofrécelo solo cuando la persona diga que el acta está revisada: tres líneas de resumen, la tabla de tareas y la próxima reunión si consta. Máximo 150 palabras. Esta skill no envía nada.

## Lo que no hace

- No es un acta oficial de junta de socios, comunidad de propietarios u órgano público: ahí es un borrador para quien la tenga que aprobar y firmar.
- No transcribe audio: necesita el texto.
