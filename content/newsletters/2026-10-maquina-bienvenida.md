---
# APROBADA por Kata el 2026-10-07 («envíala»). `draft: false` = se puede enviar.
# Checklist de voz y límites pasada el 2026-10-07 (grep: sin plural de cortesía,
# sin léxico prohibido; las únicas cifras son de la secuencia y fechas con
# fuente abajo). Los dos enlaces respondieron 200 ese mismo día.
#
# Antes de enviar, EL MISMO DÍA:
#   [ ] Léela entera. Si algo no lo dirías así, cámbialo: es tu voz, no la mía.
#   [ ] Checklist de voz y límites (sin plural de cortesía, ninguna cifra sin fuente).
#   [ ] Los dos enlaces cargan: /sistemas y /blog/que-proceso-automatizar-primero.
#   [ ] Quita `draft: true`.
#
# Fuentes de cada dato (comprobadas el 2026-10-07):
#   - Tres correos a las 0, 48 y 96 horas: content/emails/*.md (delayHours) y
#     tests/welcome-sequence.test.ts.
#   - Enlaces muertos del 29-jul al 21-ago: commit «fix(email): the welcome sequence has
#     been sending dead links since July» (2026-08-21) y docs/historico/2026-10-07-ESTADO-anterior.md.
#   - Recurso que no llegaba y /api/confirm sin comprobar su escritura: mismo histórico.
#
# Envío: ensayo en seco primero (dryRun: true), igual que en 2026-08-geo-ep1. Tras enviar de
# verdad, pon `sent: true` para publicarla en /newsletter.
issue: 2026-10-maquina-bienvenida
subject: "Tres semanas mandando correos sin un solo enlace que funcionara"
preheader: "El sistema que te dio la bienvenida, lo que hace y las tres veces que se rompió."
descripcion: "La máquina de bienvenida de este blog, por dentro: el sistema que escribe a quien se suscribe, lo que hace y las tres veces que se rompió."
title: "La máquina de bienvenida, por dentro"
date: 2026-10-15
draft: false
# Enviada el 2026-10-15 desde /panel. No reenviar.
sent: true
# Bloques de la edición visual (añadidos el 2026-10-15, después del envío): solo cambian su página
# en /newsletter, no lo que recibieron. Los tres puntos y la secuencia salen del cuerpo de abajo.
imagen:
  src: /covers/bienvenida.webp
  alt: "Panadera conversa con un visitante junto a los hornos antes de abrir la tienda."
minuto:
  - "Cuando te suscribes se programan tres correos solos: al momento, a las 48 horas y a las 96."
  - "Del 29 de julio al 21 de agosto, ningún botón llevaba a ninguna parte. Nadie me avisó."
  - "Los tres fallos no estaban en la parte difícil: estaban en la comprobación que faltaba."
secuencia:
  titulo: "Así funciona, y dónde se rompió"
  pasos:
    - titulo: "Confirmas"
      detalle: "el alta"
      fallo: "no comprobaba si se guardó"
    - titulo: "0 h"
      detalle: "tu recurso"
      fallo: "enlaces muertos"
    - titulo: "48 h"
      detalle: "segundo correo"
      fallo: "enlaces muertos"
    - titulo: "96 h"
      detalle: "tercer correo"
      fallo: "enlaces muertos"
  alt: "Al confirmar el alta salen tres correos: al momento, a las 48 horas y a las 96. La confirmación no comprobaba si el alta se había guardado, y los tres correos llevaron enlaces muertos del 29 de julio al 21 de agosto."
---

Hola,

Cuando confirmaste tu suscripción pusiste en marcha un sistema. Es el que hoy toca contar, porque
lo conoces desde dentro aunque no lo hayas visto.

### Qué hace

Tres correos que se programan solos en el momento en que confirmas: el primero sale al instante
y te entrega lo que pediste, el segundo a las 48 horas y el tercero a las 96. Yo no toco nada.
Escribo el texto una vez, en un archivo, y el sistema se encarga de que a cada persona le llegue
en su momento.

Sobre el papel es lo más aburrido que he montado. Por eso es buen ejemplo: lo aburrido es lo
que más tiempo pasa funcionando sin que nadie mire.

### Lo que se rompió

**Algo más de tres semanas mandando enlaces muertos.** Del 29 de julio al 21 de agosto, cada
correo de bienvenida salió impecable y sin un solo botón que llevara a ninguna parte. La
herramienta que convierte el texto en correo codificaba la dirección de la web de una forma que
mi sustitución no reconocía. Nadie me escribió para avisarme. Lo encontré yo, revisando.

**A quien ya estaba suscrito y pedía un recurso no le llegaba nada.** El formulario le decía «te
llega en un minuto» y por detrás no pasaba nada. Ni un error.

**La confirmación no comprobaba que se hubiera guardado.** Si la base de datos fallaba al
escribir, el sistema mandaba igual la secuencia, con un enlace de baja que no existía.

Los tres están arreglados. El de los enlaces tiene además una prueba automática que impide
publicar si vuelve a pasar; para los otros dos todavía no la tengo.

### El patrón

Ninguno de los tres fallos estaba en la parte difícil. Estaban en la comprobación que falta
alrededor: el sistema decía que todo iba bien porque nadie le preguntaba si era verdad. Es lo
que más se repite en todo lo que monto, y es lo primero que miraría en cualquier
automatización que ya tengas funcionando.

### Nuevo en la web

He rehecho el blog para que cada sistema enseñe esto mismo: qué hace, sus números y qué se
rompió.

[Ver los sistemas](https://kata.ianexora.com/sistemas?utm_source=newsletter&utm_medium=email&utm_campaign=2026-10-maquina-bienvenida)

Y si estás pensando qué automatizar primero, hay una pieza donde puntúas tus procesos y te sale
el orden. No te pide nada: la abres y la usas.

[Puntuar mis procesos](https://kata.ianexora.com/blog/que-proceso-automatizar-primero?utm_source=newsletter&utm_medium=email&utm_campaign=2026-10-maquina-bienvenida)

### Una cosa que te pido

Responde a este correo con una línea: ¿qué proceso de tu negocio funciona hoy sin que nadie
compruebe si está bien?

Lo leo yo.

Kata
