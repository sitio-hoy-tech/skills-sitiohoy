---
name: sitio-hoy-launch-automation
description: >
  Automatiza la ultima milla de un proyecto SitioHoy: preparar repo GitHub en una organizacion,
  deploy en Vercel, variables de entorno, migraciones Supabase, provisioning de tenant/admin,
  seeds de productos demo y checklist de go-live. Usar despues de sitio-hoy-qa y antes de
  entregar o publicar un sitio.
user-invokable: true
argument-hint: "[--org ORG] [--repo REPO] [--domain dominio] [--admin-email email] [--webhooks] [--no-images]"
metadata:
  author: SitioHoy
  version: "1.0.0"
  category: launch-automation
---

# SitioHoy Launch Automation

## Cuándo usar

Usar esta skill cuando el sitio ya tiene:
- `sitiohoy.config.json`
- `brief.md`
- migración Supabase generada
- `npm run build` y `sitiohoy-qa` aprobados o documentados

No ejecutar deploy real si faltan QA, env vars o credenciales. Primero generar el plan.

## Flujo

1. Leer `sitiohoy.config.json`, `brief.md` y `.env.example`.
2. Ejecutar el generador. Si no se pasa `--admin-email`, se usa automáticamente
   `admin{slug-del-negocio}@sitiohoy.com.ar`:
   ```bash
   node /ruta/a/sitio-hoy-launch-automation/scripts/generate-launch-plan.mjs --org ORG --repo REPO --domain dominio.com
   ```
3. Revisar `sitiohoy.config.json`: el generador completa `tenantId` y `siteUrl`.
4. Revisar los artefactos en `.sitiohoy/launch/`.
5. Ejecutar comandos por bloques:
   - GitHub: crear repo y push inicial.
   - Supabase: vincular proyecto con CLI, aplicar migraciones con `supabase db push`, crear tenant/admin, asociar `user_tenants`.
   - Demo data: insertar categorias/productos de prueba con migración Supabase, no SQL Editor.
   - Vercel: link/import, cargar env vars, deploy preview y production.
6. Configurar webhooks automáticamente:
   ```bash
   MP_ACCESS_TOKEN=... SITE_URL=https://tusitio.com node .claude/skills/sitio-hoy-launch-automation/scripts/setup-webhooks.mjs
   ```
   El script registra el webhook de MercadoPago (planes Emprendimiento y Empresa),
   verifica Resend y Envia.com según plan, y guarda resultados en `.sitiohoy/launch/webhook-results.json`.
7. Completar `launch-plan.md` antes de go-live.
8. Ejecutar smoke tests de integraciones activas:
   ```bash
   npm run sitiohoy:test-supabase
   npm run sitiohoy:test-mercadopago
   npm run sitiohoy:test-envia
   npm run sitiohoy:test-correo-argentino
   npm run sitiohoy:test-resend
   ```
9. Ejecutar auditoría visual con servidor local/preview activo:
   ```bash
   SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit
   ```
10. Ejecutar `npm run sitiohoy:audit` antes de entregar. Cualquier error bloquea el go-live.

## Pre-launch: Verificación de diseño

Antes de deploy:
- Confirmar que la implementación respeta el diseño de Stitch
- Comparar el sitio implementado con el diseño en Stitch página por página
- Revisar screenshots de `npm run sitiohoy:visual-audit` contra el DESIGN.md
- Si hay discrepancias mayores, resolver antes de deploy

## Artefactos generados

- `.sitiohoy/launch/launch-plan.md`
- `.sitiohoy/launch/commands.sh`
- `.sitiohoy/launch/vercel-env.example`
- `.sitiohoy/launch/provision-supabase.mjs`
- `.sitiohoy/launch/demo-products.json`
- `.sitiohoy/launch/seed-demo-data.sql`
- `.sitiohoy/launch/admin-credentials.local.json` (gitignoreado)
- `supabase/migrations/003_seed_demo_data.sql`
- `.sitiohoy/launch/webhook-results.json` (generado por `setup-webhooks.mjs`)

## Imágenes demo

El generador busca imágenes relevantes al rubro automáticamente, sin llamadas a LLM:

| Modo | Cómo activarlo | Costo |
|---|---|---|
| Unsplash API | `UNSPLASH_ACCESS_KEY=...` en env | Gratis (50 req/h). Máx 4 calls por ejecución |
| Unsplash Source | Sin key (default) | Gratis, sin auth. Keyword-based |
| Placeholders | Flag `--no-images` | Cero requests, texto en imagen |

El keyword se construye combinando la categoría + `config.keywords` / `config.description` / nombre del proyecto.
Para mejores resultados, agregar al `sitiohoy.config.json`:
```json
{ "keywords": "zapatería moda calzado" }
```

Si el cliente no envió fotos, NO dejar placeholders genéricos salvo que se use `--no-images` por una razón documentada.
Usar Unsplash con keywords relacionadas a rubro, categoría y producto. Registrar keyword/fuente en tracking.

## Paralelización

**Lo que puede ejecutarse en paralelo:**

**Grupo A — preparación local** (sin acceso a servicios externos):
- Generar `launch-plan.md`
- Generar `commands.sh`
- Generar `vercel-env.example`
- Generar `provision-supabase.mjs`
- Generar `seed-demo-data.sql`

Todos los artefactos del Grupo A son independientes entre sí.

**Grupo B — servicios externos** (requieren credenciales y acceso a red):
- Crear repo en GitHub (`gh repo create`)
- Crear proyecto en Supabase y aplicar migraciones (`supabase db push`)
- Vincular proyecto en Vercel (`vercel link`)

GitHub, Supabase y Vercel son independientes entre sí y pueden iniciarse en paralelo.
Excepción: el deploy final de Vercel requiere que el repo de GitHub exista primero.

**Lo que es estrictamente secuencial:**
1. Grupo A debe terminar antes de ejecutar Grupo B (necesita los artefactos)
2. Provisioning de tenant/admin → después de que Supabase esté listo
3. Seed de datos demo → después del provisioning
4. Deploy preview → después de que repo GitHub y Vercel estén vinculados
5. Deploy production → después de validar el preview
6. Configurar webhooks → después de que la URL de producción exista

## Reglas

- Nunca commitear secretos reales.
- `SUPABASE_SERVICE_ROLE_KEY`, tokens MercadoPago, Resend y Envia van en env vars o tabla `tenants`, no en Git.
- Usar Supabase CLI para migraciones, seeds y storage. No subir SQL o datos por Dashboard salvo bloqueo documentado.
- El usuario admin se crea con Supabase Admin API, no insertando directo en `auth.users`.
- El email admin debe ser `admin{slug-del-negocio}@sitiohoy.com.ar` y la contraseña debe ser aleatoria segura.
- La fila `tenants` y la fila `user_tenants` deben existir antes de entregar el proyecto.
- Los productos demo deben poder borrarse o reemplazarse sin romper diseño.
- Si faltan CLIs (`gh`, `vercel`, `supabase`), instalar/configurar antes de ejecutar. Para Supabase no usar Dashboard como camino normal.

## Referencias

- Para checklist completo, leer `references/launch-checklist.md`.
