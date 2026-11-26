# Lead magnet — «Kit Acta de reunión con IA»

Descargable del artículo `acta-de-reunion-con-ia` (frontmatter `recurso: kit-acta-reunion-ia`). Versión 1.0, preparada el 23/11/2026.

El kit (`kit-acta-reunion-ia.zip`) vive solo en el bucket privado `lead-magnets`, ruta `kit-acta-reunion-ia/kit-acta-reunion-ia.zip`, con la fila `kit-acta-reunion-ia` en `public.resources`. El zip no está en el repo; aquí están los generadores.

Contenido: guía PDF (`kit.html` + `kit.css`), instrucciones para la IA (`instrucciones.txt`), plantilla Word (`gen_docx.py`), registro de acuerdos Excel (`gen_xlsx.py`) y la skill para Claude (`skill/acta-de-reunion/`).

PDF: `google-chrome --headless=new --no-pdf-header-footer --print-to-pdf=guia.pdf kit.html`. Necesita `logo-horizontal.png` (logo NBI) y las fuentes Instrument Sans / Instrument Serif en `fonts/`, que no se versionan aquí.
