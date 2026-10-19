# kata.ianexora.com

Código del blog y la newsletter de Kata Ivanovych: artículos, noticias diarias sobre IA, herramientas que funcionan en el navegador y un correo semanal con doble opt-in. En producción en [kata.ianexora.com](https://kata.ianexora.com).

## Arrancar

```bash
npm ci
npm run dev        # Velite (contenido) + Next, en paralelo
```

Sin variables de entorno el sitio arranca igual. Las rutas que usan Supabase o Resend responden con un error controlado hasta que se configuran (ver `.env.example`).

## Comprobar

```bash
npm run verify     # typecheck + eslint + tests (node:test)
npm run build      # velite build --strict + next build
```

## Contenido

- `content/posts/`: artículos y ediciones de noticias (MDX, validados por Velite).
- `content/newsletters/`, `content/emails/`: newsletter y secuencia de bienvenida.
- `content/bitacora/`: la bitácora pública del sitio.

## Automatizaciones (`.github/workflows/`)

- **Noticias diarias**: recoge titulares de RSS, Claude redacta la edición, varios scripts comprueban que no se ha inventado nada y se publica en `main` (Vercel despliega).
- **YouTube** y **Semanal**: abren un PR con el borrador; una persona lo revisa antes de publicar.
- **CI** e **IndexNow**: verificación en cada cambio y aviso a buscadores.

Secretos que necesitan (solo nombres): `CLAUDE_CODE_OAUTH_TOKEN`; para LinkedIn, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_ID` y `LINKEDIN_TOKEN_EXPIRES`.
