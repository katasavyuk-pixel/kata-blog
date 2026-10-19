# Recurso `maitreai-geo` — fuente del ZIP

Lo que sirve `/api/download` para el slug `maitreai-geo` es
`maitreai-geo/recurso-maitreai-geo.zip`, en el bucket privado `lead-magnets` de Supabase
Storage.

**`zip/` es exactamente lo que va dentro.** Ni más ni menos: se comprime el directorio entero,
así que no hay lista de exclusiones que se pueda quedar desfasada.

```
zip/README.md               qué es esto y cómo se usa
zip/prompt.md               el prompt de auditoría, para pegar en un agente de código
zip/comprobaciones-geo.md   las 9 comprobaciones y la tabla
```

Este README no va dentro: es documentación del repo.

## Reconstruirlo

```bash
cd lead-magnets/maitreai-geo/zip
rm -f ../recurso-maitreai-geo.zip
zip -q -r ../recurso-maitreai-geo.zip . -x '.*'
```

El `.zip` resultante está en `.gitignore`: es un artefacto derivado y la fuente ya está
versionada. El `-x '.*'` evita colar `.DS_Store`.

Y súbelo. El CLI **sí** puede, al contrario de lo que decía una nota vieja: está autenticado y
el proyecto enlazado.

```bash
# `cp` no sobrescribe (devuelve 409) y `rm` no borra por ruta de objeto — devuelve
# "deleted": [] sin tocar nada. `mv` sí funciona, así que se aparta el viejo primero.
supabase storage mv ss:///lead-magnets/maitreai-geo/recurso-maitreai-geo.zip \
                   ss:///lead-magnets/maitreai-geo/_old-AAAA-MM-DD.zip --experimental
supabase storage cp recurso-maitreai-geo.zip \
                   ss:///lead-magnets/maitreai-geo/recurso-maitreai-geo.zip --experimental
```

Comprueba siempre bajándolo de vuelta y comparando el sha256 con el local — la respuesta de
`cp` dice que subió algo, no que subiera lo que crees.

No hay que tocar la base de datos para cambiar el fichero: la fila apunta a esa ruta y el enlace
se firma en cada descarga, así que el siguiente que pulse se lleva el ZIP nuevo. Sí hay que
tocarla si cambia la **descripción**, y entonces se cambia también `supabase/seeds/resources.sql`
para que el repo no mienta:

```bash
supabase db query "update public.resources set description = '…' where slug = 'maitreai-geo';" --linked
```

## Historia, por si vuelve a pasar

El ZIP se subió a mano el 2026-08-20 con solo `README.md` y `prompt.md`, y su contenido **no se
versionó**. Eso dejó dos agujeros a la vez: nadie podía revisar en un diff qué se entregaba a
quien deja su dirección, y **el vídeo mencionaba unas comprobaciones y una tabla que el ZIP no
llevaba**.

`comprobaciones-geo.md` cierra el segundo. Está construido desde
el informe real de esa auditoría, y no de
memoria: cada cifra que aparece en él (33 URLs, nueve canonicals, 13 preguntas declaradas, 242
tildes repuestas) sale de ahí.

Y el primero lo cierra este directorio. La regla que queda: **si cambia lo que se entrega,
cambia `zip/` y se reconstruye.** No se edita el ZIP a mano nunca más.
