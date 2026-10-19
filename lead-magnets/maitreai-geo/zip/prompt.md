# Prompt de auditoría GEO

Pégalo tal cual en tu agente de código. Sustituye los campos entre corchetes por la información
de tu propio proyecto. El prompt es general: no depende de MaitreAI, de restaurantes ni de una
tecnología concreta.

```text
Actúa como auditor de visibilidad en motores generativos para mi producto o servicio.

CONTEXTO

- Dominio público: [DOMINIO]
- Producto o servicio: [DESCRIPCIÓN BREVE]
- Público objetivo: [TIPO DE CLIENTE]
- Repositorio o fuente de trabajo: [RUTA]
- Fuente de verdad sobre el producto: [CONFIGURACIÓN, JSON-LD, DOCUMENTACIÓN O PÁGINA PÚBLICA]
- Rutas privadas que nunca debes abrir ni modificar: [PANEL, API, CUENTAS, DATOS DE CLIENTES]

OBJETIVO

Comprueba si una IA puede encontrar, entender y considerar mi oferta cuando alguien hace una
pregunta relevante. Separa descubrimiento, comprensión, evidencia, recomendación y conversión.
No confundas una mejora técnica con una garantía de recomendación.

REGLAS DE SEGURIDAD

- No leas, imprimas ni copies secretos, tokens, claves, certificados, `.env` o credenciales.
- No accedas a paneles privados, conversaciones, bases de datos ni datos de clientes.
- No inventes funcionalidades, precios, clientes, métricas, testimonios, certificaciones ni fuentes.
- No hagas deploy, push, commit, migraciones ni cambios de permisos.
- No modifiques autenticación, RLS, APIs privadas ni rutas protegidas.
- No prometas que el producto aparecerá o será recomendado por una IA.
- Si no puedes comprobar algo, marca el resultado como `BLOCKED`.

FASE 1 — INVENTARIO PÚBLICO

Revisa únicamente lo necesario para entender las páginas públicas:

1. Nombre y descripción del producto.
2. Página principal y páginas públicas importantes.
3. Títulos, metadescripciones y encabezados.
4. Canonical, sitemap y robots.txt.
5. Datos estructurados JSON-LD.
6. Enlaces internos y señales de identidad.
7. Idioma, contacto y evidencia pública.

FASE 2 — COMPROBACIÓN HTTP

Comprueba únicamente estas URLs públicas:

- [DOMINIO]
- [URLS PÚBLICAS IMPORTANTES]
- `/robots.txt`
- `/sitemap.xml`

Para cada URL registra código HTTP, URL final, canonical, disponibilidad del contenido principal,
referencias a localhost o dominios incorrectos, rutas privadas expuestas y errores.

FASE 3 — INFORME GEO

Clasifica cada hallazgo como:

- `PASS`: comprobado y correcto.
- `WARN`: posible riesgo o mejora no bloqueante.
- `FAIL`: problema concreto.
- `BLOCKED`: no se puede comprobar sin acceso adicional.

Genera un informe con resumen ejecutivo, evidencias, prioridades, archivos que habría que tocar,
criterios de verificación, riesgos de seguridad, cambios que no conviene hacer y límites de lo
que puede concluirse.

Si propones crear un archivo de texto para describir el sitio a herramientas que lo consuman,
trátalo como una mejora opcional, no como un requisito oficial de Google ni como una garantía.

No apliques ningún cambio. Cuando termines, confirma qué has leído y termina exactamente con:

AUDIT STATUS: REVIEW REQUIRED
PUBLICATION STATUS: NOT APPROVED
RECOMMENDATION GUARANTEE: NEVER GUARANTEED
```
