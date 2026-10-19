---
# DESBLOQUEADA el 2026-08-21 (tarde): el artículo /blog/antes-del-tms-tu-inbox está publicado
# y /recursos sirve el checklist desde el 2026-08-05 — los dos bloqueadores de abajo están
# resueltos. Lo que queda es solo tuyo: leerla entera y pasar la checklist de
# voz y límites EL MISMO DÍA del envío antes de quitar `draft: true`.
# (Recuerda: tras enviar de verdad, pon también `sent: true` para publicarla en /newsletter.)
#
# El histórico de los bloqueadores, por si vuelven a importar:
#   1. content/posts/antes-del-tms-tu-inbox.mdx seguía en draft:true -> el enlace daba 404.
#   2. /recursos no servía nada descargable todavía.
issue: 2026-08-antes-del-tms
subject: Empecé por el sitio equivocado
preheader: El software que compras empieza donde el trabajo repetitivo ya ha terminado.
title: "Empecé por el sitio equivocado"
date: 2026-08-04
draft: true
---

Hola,

Esta semana publiqué un artículo sobre una idea sencilla: **antes del TMS hay otro sistema, y
es tu bandeja de entrada**. Un TMS —o un ERP, o un CRM— no crea datos: los recibe. Quien los
crea es una persona leyendo un correo y tecleando lo que dice.

Ese artículo lo dejo abajo. Aquí te cuento lo que no cabía en él, que es cómo me equivoqué yo.

### Empecé construyendo la parte divertida

Cuando me metí en esto, lo primero que quise construir fue el clasificador. La parte con
gráfica, la que se enseña bien: el modelo lee el correo, decide de qué va, saca los datos.

Estuve un buen rato optimizando esa pieza antes de darme cuenta de que no tenía respuesta a
una pregunta de tres palabras: **¿qué campos exactamente?**

Porque "sacar los datos del email" no es una especificación. Es un deseo. Y sobre un deseo se
puede construir una demo preciosa que no le sirve a nadie, que es exactamente lo que estaba
haciendo. El trabajo aburrido —sentarme a listar campo por campo lo que una persona teclea a
mano— era el trabajo de verdad, y lo estaba evitando porque no se enseña bien en un vídeo.

Cuando por fin lo hice, salieron 25 campos en cinco bloques. No es una estadística del sector,
que quede claro: es una cuenta de un inventario concreto. Pero fue la primera vez que pude
decidir qué automatizar sin discutir de oído.

### La regla que saqué de ahí

**No puedes automatizar un proceso que no sabes describir.** Y la prueba de que sabes
describirlo no es contarlo bien en una reunión: es escribir la lista de campos.

Es incómoda esta regla, porque mueve el cuello de botella de la tecnología —que es lo que uno
quiere comprar— a la definición, que es trabajo tuyo y no se puede subcontratar del todo. Pero
te ahorra el error caro: montar el sistema y descubrir a los dos meses que resuelve la parte
fácil del caso, y que lo que queda fuera es justo lo que dolía.

### El recurso: el inventario de 20 minutos

Esto lo puedes hacer hoy, sin herramientas y sin gastar un euro. Necesitas tu buzón y un folio
(o una hoja de cálculo, que es más útil).

**1. Coge los 10 últimos correos** de ese tipo que recibes siempre — pedidos, confirmaciones,
facturas, citas, incidencias. Los 10 últimos, sin elegir los bonitos.

**2. Por cada correo, escribe qué campos acaba tecleando alguien** en tu sistema. Una fila por
campo. No agrupes: "fecha de carga" y "hora límite de entrega" son dos, no uno.

**3. Marca cada campo con tres columnas:**

| Campo | Veces/semana | ¿Error caro? (S/N) | ¿Llega siempre igual? (S/N) |
|---|---|---|---|
| | | | |

- *Veces/semana*: cuántas veces se teclea. Aproximado vale, pero cuéntalo, no lo estimes de
  memoria.
- *¿Error caro?*: si entra mal, ¿se arregla en dos minutos, o hay que llamar a un cliente?
- *¿Llega siempre igual?*: ¿mismo formato y mismo sitio en el mensaje, o cada remitente lo
  escribe a su manera?

**4. Ordena por la primera columna y mira las cinco primeras filas.** Ahí está tu candidato.
Si alguna de esas cinco tiene además "error caro = S", esa es la primera, y va con revisión
humana obligatoria — sin excepción.

**5. Lo que quede abajo del todo, déjalo.** Poco volumen y error barato no es un problema que
merezca un sistema. Es solo trabajo.

Veinte minutos. Y si acabas con la lista escrita, ya tienes más de lo que yo tenía cuando
empecé a construir.

### El artículo

Ahí está el patrón completo: por qué esto pasa igual en una asesoría o en una clínica que en
una empresa de transporte, el cuadro para decidir qué tocar, y la forma que tiene el arreglo
(inbox → extracción → **revisión humana** → dato validado).

→ **[Antes del TMS hay otro sistema: tu inbox](https://kata.ianexora.com/blog/antes-del-tms-tu-inbox?utm_source=newsletter&utm_medium=email&utm_campaign=antes-del-tms)**

Y si quieres el inventario ya hecho —los 25 campos y el filtro de tres preguntas, en
checklist— está aquí:

→ **[Llévate el checklist](https://kata.ianexora.com/recursos?utm_source=newsletter&utm_medium=email&utm_campaign=antes-del-tms)**

Una cosa que te debo: todavía no tengo números públicos de esto. Cuando tenga los de un caso
real y permiso para enseñarlos, los vas a ver aquí con fecha — y también los que salgan mal.
De momento lo que puedo enseñar es el diseño, no un porcentaje de ahorro. Prefiero decírtelo a
inventarme una cifra bonita.

Nos leemos,
Kata

---

*Aparte, y solo si te aplica:* si tienes un negocio en marcha y prefieres que mire tu caso
contigo, cuéntamelo en [Trabaja con NBI](https://kata.ianexora.com/trabaja-con-nbi?utm_source=newsletter&utm_medium=email&utm_campaign=antes-del-tms-nbi)
— qué proceso te está costando tiempo o dinero. Te digo si tiene sentido automatizarlo y por
dónde empezaría. Contesto yo, no un equipo comercial. Si no te aplica, ignora este párrafo:
el recurso de arriba funciona igual de bien por su cuenta.
