#!/usr/bin/env bash
# Verificación del embudo contra producción.
#
#   bash scripts/verificar-embudo.sh [email-de-pruebas]
#
# El secreto NUNCA se pasa como argumento ni se imprime, para que se pueda
# ejecutar dentro de una sesión de Claude Code sin que acabe en la transcripción.
# Se busca, en este orden:
#
#   1. La variable NEWSLETTER_SEND_SECRET, si está exportada.
#   2. El PORTAPAPELES (macOS). Copia el secreto de tu gestor y ejecuta esto.
#      Es la vía dentro de una sesión de agente: el `!` corre sin terminal
#      interactiva, así que un `read` no recibiría nada.
#   3. El teclado, solo si hay terminal de verdad.
#
# Sin argumento usa $VERIFICAR_EMBUDO_CORREO (obligatorio). Usa un alias con "+" para
# poder borrar la fila después: en `subscribers`, filtra por ese email.

set -uo pipefail

BASE="https://kata.ianexora.com"
CORREO="${1:-${VERIFICAR_EMBUDO_CORREO:?Pasa el correo de prueba como argumento o en VERIFICAR_EMBUDO_CORREO}}"
RECURSO="25-datos-emails-logisticos"

if [ -n "${NEWSLETTER_SEND_SECRET:-}" ]; then
  SECRETO="$NEWSLETTER_SEND_SECRET"; ORIGEN="variable de entorno"
elif [ -t 0 ]; then
  printf 'Secreto (NEWSLETTER_SEND_SECRET): '; read -rs SECRETO; echo
  ORIGEN="teclado"
elif command -v pbpaste >/dev/null 2>&1; then
  SECRETO="$(pbpaste | tr -d '\r\n')"; ORIGEN="portapapeles"
else
  SECRETO=""; ORIGEN="ninguna"
fi

if [ -z "$SECRETO" ]; then
  cat <<'FIN'
No he encontrado el secreto (fuentes probadas: variable de entorno, teclado,
portapapeles).

Dentro de una sesión de Claude Code no hay terminal interactiva, así que la vía
es el portapapeles: copia NEWSLETTER_SEND_SECRET de tu gestor de contraseñas y
vuelve a ejecutar esto. El valor no se imprime en ningún momento.
FIN
  exit 1
fi

# Longitud, nunca el valor: confirma que se leyó algo plausible sin exponerlo.
echo "Secreto leído del $ORIGEN (${#SECRETO} caracteres)."

# Comprobar el secreto ANTES de hacer nada. El portapapeles es ambiguo —
# gana lo último que se copió, y aquí hay dos secretos en juego (el del boletín
# y el del panel). Sin esta comprobación, usar el equivocado se manifestaría como
# un fallo raro a mitad del script, después de haber tocado producción.
PRUEBA=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/welcome-sequence/test" \
  -H "Authorization: Bearer $SECRETO" -H 'Content-Type: application/json' \
  -d '{"email":"probe@example.com","dryRun":true}')
if [ "$PRUEBA" = "401" ]; then
  cat <<'FIN'

Ese no es NEWSLETTER_SEND_SECRET: el servidor lo rechaza (401).

Si vienes del portapapeles, seguramente tienes copiado el del panel. Copia el
del boletín de tu gestor de contraseñas y vuelve a ejecutar esto. No se ha
enviado ningún correo ni se ha tocado nada.
FIN
  exit 1
fi
[ "$PRUEBA" = "200" ] && echo "Secreto correcto (el servidor lo acepta)." \
                      || echo "Aviso: la comprobación devolvió $PRUEBA, no 200/401. Sigo."

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FALLOS=$((FALLOS+1)); }
FALLOS=0

echo
echo "1. Páginas y JSON-LD ─────────────────────────────────────────"
node scripts/geo/audit-ssr.mjs "$BASE" > /tmp/geo-verif.txt 2>&1 \
  && ok "auditoría GEO sin problemas (12 tipos de página)" \
  || { bad "la auditoría GEO marca algo — mira /tmp/geo-verif.txt"; tail -20 /tmp/geo-verif.txt; }

echo
echo "2. Endpoints protegidos ──────────────────────────────────────"
for ruta in api/welcome-sequence/test api/newsletter/send; do
  c=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/$ruta" \
        -H 'Content-Type: application/json' -d '{}')
  [ "$c" = "401" ] && ok "$ruta rechaza sin credenciales (401)" \
                   || bad "$ruta devuelve $c, esperaba 401"
done

echo
echo "3. La descarga exige email confirmado ────────────────────────"
r=$(curl -s -o /dev/null -w '%{redirect_url}' "$BASE/api/download?slug=$RECURSO")
[[ "$r" == *"need_email=$RECURSO"* ]] && ok "sin credenciales rebota y explica por qué" \
                                     || bad "esperaba rebote a need_email, dio: $r"
r=$(curl -s -o /dev/null -w '%{redirect_url}' \
      "$BASE/api/download?slug=$RECURSO&e=falso@x.com&exp=99999999999999&sig=deadbeef")
[[ "$r" == *"need_email"* ]] && ok "una firma inválida NO sirve el fichero" \
                            || bad "¡una firma falsa pasó! dio: $r"

echo
echo "4. Ensayo en seco del boletín ────────────────────────────────"
d=$(curl -s -X POST "$BASE/api/newsletter/send" \
      -H "Authorization: Bearer $SECRETO" -H 'Content-Type: application/json' \
      -d '{"issue":"2026-08-antes-del-tms","dryRun":true}')
echo "  respuesta: $d"
case "$d" in
  *'"dryRun":true'*) ok "el envío funciona y NO ha mandado nada" ;;
  *draft*)           ok "responde bien: la edición sigue en draft (esperado)" ;;
  *)                 bad "respuesta inesperada" ;;
esac

echo
echo "5. Secuencia de bienvenida a $CORREO ─────────────────────────"
s=$(curl -s -X POST "$BASE/api/welcome-sequence/test" \
      -H "Authorization: Bearer $SECRETO" -H 'Content-Type: application/json' \
      -d "{\"email\":\"$CORREO\",\"resource\":\"$RECURSO\"}")
enviados=$(printf '%s' "$s" | grep -o '"sent":true' | wc -l | tr -d ' ')
aviso=$(printf '%s' "$s" | sed -n 's/.*"aviso":"\([^"]*\)".*/\1/p')
[ "$enviados" = "3" ] && ok "3 de 3 pasos enviados" \
                      || { bad "solo $enviados de 3 enviados"; echo "  $s"; }
[ -n "$aviso" ] && printf '  \033[33m!\033[0m %s\n' "$aviso"

cat <<'FIN'

─────────────────────────────────────────────────────────────────
Lo que falta ya no lo puede comprobar un script. En tu bandeja:

  [ ] Llegan 3 correos con asunto "[PRUEBA] …"
  [ ] El 1º trae la TABLA del desglose de costes y la fórmula
  [ ] Los 3 llevan "Cancelar suscripción" visible al pie
  [ ] Responder a cualquiera de ellos llega a un buzón que leas
      ← si no, el reply rate es cero por construcción

OJO con el botón de descarga: aquí NO va a servir el PDF, y es correcto.
La descarga exige un suscriptor confirmado, y el modo prueba no crea
ninguno (no escribe en la base de datos, que es lo que lo hace seguro).
Si el aviso amarillo de arriba ha salido, es exactamente eso.

Para probar la descarga de verdad hace falta un alta real:

  curl -X POST https://kata.ianexora.com/api/subscribe \
    -H 'Content-Type: application/json' \
    -d '{"email":"TU+e2e@gmail.com","resource":"25-datos-emails-logisticos",
         "consent":true,"signupPath":"/herramientas","source":"recursos"}'

...y pulsar el enlace de confirmación que llega. El email que viene DESPUÉS
de confirmar sí lleva un botón que sirve el PDF.
FIN

echo
[ "$FALLOS" -eq 0 ] && echo "Automático: todo verde." || echo "Automático: $FALLOS fallos."
exit $FALLOS
