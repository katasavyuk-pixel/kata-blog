---
key: w3-sistema
sequence: bienvenida
order: 3
delayHours: 96
subject: "⚙️ El sistema que me publica las noticias sin que yo escriba nada"
preheader: "Y la parte interesante: por qué no puede inventarse un titular."
title: "Un sistema que trabaja solo y no puede mentir"
---

Este es el sistema más útil que tengo publicado, y es el que menos se ve.

Cada mañana, sin que yo toque nada, se recogen las novedades de una lista fija de fuentes de tecnología, negocio y economía, se quitan las repetidas y se redacta la edición de Noticias. Se publica sola: nadie la aprueba antes.

## La parte que importa no es que escriba: es que no pueda inventar

Un modelo que redacta noticias se inventa titulares. No de vez en cuando: es lo que hace cuando le falta un dato. Y una noticia inventada en un sitio que va de rigor te destruye justo lo que estabas construyendo.

Así que el sistema no confía en el modelo. Antes de que exista la edición, un paso automático comprueba que **cada enlace de la lista existe tal cual en lo que se recogió**. Si aparece uno que no estaba, el proceso falla y no se publica nada. No hay un aviso que alguien pueda pasar por alto: sin esa comprobación en verde, no hay edición.

[Ver cómo funciona y las ediciones]({{url_sitio}}/noticias)

## El límite honesto

Estuvo dos semanas sin publicar y no me di cuenta a tiempo.

La comprobación era demasiado estricta: comparaba los titulares carácter a carácter, y al reescribirlos el modelo cambiaba una comilla curva por una recta. El sistema lo leía como un titular inventado y bloqueaba la edición entera. Dos ediciones legítimas se quedaron fuera mientras la web seguía anunciando que salía cada lunes.

Está arreglado: ahora los titulares se comparan ignorando ese tipo de detalles tipográficos y el enlace se sigue comparando tal cual, que es lo que de verdad identifica una noticia. Y la portada ya no puede mentir sobre su propia cadencia: si la última edición pasa de dos días, cambia sola el mensaje.

Lo cuento porque es el patrón que se repite en todo lo que monto: el sistema no falla por el modelo, falla por la comprobación que pusiste alrededor.

## Si esto te encaja

Esto es lo que hago en NBI, mi negocio de soluciones de IA: montar sistemas así para procesos que consumen horas — leer correos, sacar datos de documentos, tareas repetitivas que alguien hace a mano cada día.

Si tienes uno de esos, responde a este email y cuéntame cuál es. Te digo qué haría yo y si la IA ayuda o no; a veces la respuesta es que no.

Y si prefieres un formulario a un correo, está [aquí]({{url_sitio}}/trabaja-con-nbi).

Este es el único email de este tipo que te mando. La newsletter sigue igual: sistemas y números, sin venta.
