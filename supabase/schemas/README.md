# Supabase — esquema y migraciones

El modelo de datos **completo** está diseñado desde el día 1 (ver `CLAUDE.md` →
"Modelo de datos"); las tablas se crean por fases.

| Tabla | Fase | Estado |
|---|---|---|
| `subscribers` | Fase 2 | Migración escrita (`../migrations/0001_subscribers_resources.sql`) |
| `resources` | Fase 2 | Migración escrita (idem) |
| `post_views` | Fase 1 (opcional) | No implementado |
| `profiles` | Fase 3 | Diseñado, no implementado |
| `subscriptions` | Fase 3 | Diseñado, no implementado |

## Aplicar la migración de Fase 2 (cuando exista el proyecto)

Requiere un proyecto Supabase en **eu-central-1** (Frankfurt). Con la CLI enlazada:

```bash
supabase db push          # aplica supabase/migrations/*.sql al proyecto remoto
```

O con el MCP de Supabase: `apply_migration` con el contenido de
`migrations/0001_subscribers_resources.sql`.

Después:

1. Verificar RLS y grants: `has_function_privilege('anon', 'public.increment_download_count(uuid)', 'EXECUTE')` debe ser `false`.
2. Confirmar el bucket `lead-magnets` como **privado**.
3. Regenerar tipos: `supabase gen types typescript` (o MCP `generate_typescript_types`).

`RLS ON` en todas. Default-deny; escrituras vía servidor (`service_role`) o RPC
`SECURITY DEFINER`. Detalle por tabla en `CLAUDE.md`.
