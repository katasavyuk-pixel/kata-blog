# Lead magnet — «Kit de política de uso de IA para tu equipo»

Descargable del artículo `politica-de-uso-de-ia-en-la-empresa` (frontmatter `recurso: kit-politica-uso-ia`).
Encargo de Kata del 2026-11-23. Versión 1.0, preparada el 23/11/2026.

| Pieza | Dónde vive | Cómo llega |
|---|---|---|
| **El kit** (`kit-politica-uso-ia.zip`) | Bucket privado `lead-magnets`, ruta `kit-politica-uso-ia/kit-politica-uso-ia.zip`, fila `kit-politica-uso-ia` en `public.resources` | Formulario «Enviármelo» del artículo → doble opt-in → botón de descarga firmado en el primer correo (o `sendResourceDelivery` si el correo ya estaba confirmado). También desde `/herramientas`. |

El zip **no está en el repo**: vive solo en el bucket. Aquí están los generadores, para poder rehacerlo.

## Qué contiene el zip

Carpeta `kit-politica-uso-ia/`:

- `01-guia-kit-politica-uso-ia.pdf`: la guía. Por qué ahora (con fuentes), el modelo de política, el semáforo,
  la charla de 20 minutos y tres textos para usar la IA sin datos personales. Sale de `kit.html` + `kit.css`.
- `02-politica-uso-ia.docx`: la política editable; lo que hay que rellenar va en amarillo. Sale de `gen_docx.py`.
- `03-semaforo-de-datos-A4.pdf`: el cartel para imprimir (página 6 de la guía).
- `04-registro-ia.xlsx`: herramientas autorizadas, formación e incidencias. Las filas amarillas son ejemplos
  inventados, rotulados como tales. Sale de `gen_xlsx.py`.
- `LEEME.txt`: por dónde empezar, aviso de que no es asesoramiento jurídico y fuentes.

## Cómo se regenera

Los archivos no se editan a mano: se cambia el generador y se vuelve a generar. Las fuentes (`fonts/`) y el
logo (`logo-horizontal.png`) no van en el repo: son los de `nbi_social/assets`. Cópialos junto a los
generadores antes de empezar.

```bash
cd lead-magnets/kit-politica-uso-ia
cp -r /workspace/nbi_social/assets/fonts /workspace/nbi_social/assets/logo-horizontal.png .

# Guía en PDF (Chrome headless) y semáforo (página 6)
google-chrome --headless=new --no-pdf-header-footer --print-to-pdf=guia.pdf kit.html
pdfseparate -f 6 -l 6 guia.pdf semaforo.pdf

# Política en Word y registro en Excel (python-docx y openpyxl)
python3 gen_docx.py   # → politica.docx
python3 gen_xlsx.py   # → registro.xlsx
```

Después se renombran como en la lista de arriba, se meten en la carpeta `kit-politica-uso-ia/` con el
`LEEME.txt` y se comprime en `kit-politica-uso-ia.zip`. No subas al repo el zip, los PDF, el docx, el xlsx,
las fuentes ni el logo.

## Publicar (o republicar) el kit

El orden importa: primero el archivo, luego la fila, luego el artículo. Si la fila está publicada y el archivo
no existe, la descarga falla justo después de confirmar el correo. Y el artículo con `recurso:` promete una
descarga: no se publica si el archivo o la fila no están.

1. Sube `kit-politica-uso-ia.zip` al bucket `lead-magnets`, carpeta `kit-politica-uso-ia/`.
2. Ejecuta su bloque de `supabase/seeds/resources.sql` en el editor SQL del proyecto.
3. Comprueba que `/herramientas` lo lista, y mándate la secuencia de prueba
   (`POST /api/welcome-sequence/test`) con `resource: kit-politica-uso-ia`. Descarga el zip desde el botón
   del correo y ábrelo.

## Fuentes

Leídas el 23/11/2026 (las mismas que cita el artículo):

- Reglamento (UE) 2026/1744 (Ómnibus digital sobre IA): https://www.boe.es/buscar/doc.php?id=DOUE-L-2026-81147
- Comisión Europea, «AI Literacy - Preguntas & Respuestas»: https://digital-strategy.ec.europa.eu/es/faqs/ai-literacy-questions-answers
- AEPD, decálogo de asistentes y agentes de IA (27/10/2026) y «Cuidado con lo que le confIAs»:
  https://www.aepd.es/guias-y-herramientas/guias y https://www.aepd.es/guias/recomendaciones-ia-aepd.pdf

Es una base práctica para adaptar, no asesoramiento jurídico. Si cambia la normativa, se revisa la guía, el
Word y el `LEEME.txt`, y se sube un zip nuevo con la misma ruta.
