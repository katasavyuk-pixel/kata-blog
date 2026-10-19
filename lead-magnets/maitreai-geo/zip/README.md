# Prompt de auditoría GEO — el kit del episodio “MaitreAI no salió”

Este recurso convierte el proceso del vídeo en una auditoría reutilizable para cualquier
producto, servicio o negocio. No promete que una IA vaya a recomendarte: te ayuda a comprobar
si puede encontrarte, entenderte y considerar tu oferta.

El prompt separa descubrimiento, comprensión, evidencia, recomendación y conversión. Devuelve
resultados `PASS`, `WARN`, `FAIL` o `BLOCKED` para que puedas revisar el diagnóstico antes de
aplicar cambios.

## Qué hay aquí

| Archivo | Qué es |
| --- | --- |
| `prompt.md` | El prompt de auditoría, para pegar en tu agente de código. |
| `comprobaciones-geo.md` | Las 9 comprobaciones que hago antes de decir que un sitio está listo para una IA, con el comando de cada una y lo que salió en mi caso. En el vídeo solo cupieron dos. |

Si solo vas a leer una cosa, que sea la 7 de `comprobaciones-geo.md`: si tu texto no llega en
el HTML servido, nada de lo demás importa.

## Cómo usarlo

1. Abre una terminal en la carpeta de tu web o producto.
2. Lanza tu agente de código, por ejemplo [Claude Code](https://claude.com/claude-code) u
   [OpenCode](https://opencode.ai).
3. Copia y pega el prompt de [`prompt.md`](prompt.md).
4. Sustituye los campos entre corchetes por la información de tu propio proyecto.
5. Revisa el informe antes de aplicar o publicar cualquier cambio.
6. Pasa las 9 comprobaciones de `comprobaciones-geo.md` contra tu dominio en producción, no
   contra tu portátil. Es donde se cae la mitad de lo que parecía correcto en local.

## La comprobación de seguridad importante

Si tu `robots.txt` ya protege alguna ruta privada con una regla genérica (`User-Agent: *`) y
añades un bot con su propio grupo, ese bot puede dejar de heredar la protección genérica. Si el
informe propone modificar `robots.txt`, conserva cada bloqueo privado en todos los grupos que
apruebes.

El prompt no abre rutas privadas, no lee secretos, no despliega cambios y no garantiza que una
IA recomiende tu negocio. Su trabajo es ayudarte a separar lo comprobado de lo que todavía no
puedes demostrar.

El recurso acompaña al episodio sobre MaitreAI, un producto real de atención y reservas para
negocios locales. El mismo método se puede adaptar a cualquier sector.
