---
skill: skills-especializadas
descripcion: Mapa de skills auxiliares SitioHoy para industrializar briefing, scaffold, base de datos, QA y launch
tipo: core — cargar al inicio junto al orquestador
---

# Skills Especializadas SitioHoy

La skill `sitio-hoy` orquesta el proyecto. Las siguientes skills ejecutan etapas
con mayor determinismo y menos contexto cargado.

## Ubicación de skills por IA

Las skills se instalan **por proyecto** (no globalmente) en el directorio correspondiente a cada IA:

| IA | Directorio de skills | Archivo de contexto |
|---|---|---|
| Claude Code | `.claude/skills/<nombre>/SKILL.md` | `CLAUDE.md` |
| OpenAI Codex | `.agents/skills/<nombre>/SKILL.md` | `AGENTS.md` |
| OpenCode | `.opencode/skills/<nombre>/SKILL.md` | `AGENTS.md` |

Para invocar una skill en cualquier IA que no soporte delegación automática:
leer directamente el archivo `SKILL.md` de la skill y seguir su Workflow.

## Orden recomendado

1. `sitio-hoy-briefing`
   - Usar al iniciar un proyecto nuevo.
   - Genera `sitiohoy.config.json` y `brief.md` desde onboarding + briefing.

2. `sitio-hoy-project-director`
   - Usar despues de briefing y antes de scaffold/modulos.
   - Genera context packs minimos y direccion visual portable en `.sitiohoy/context/` y `.sitiohoy/design/`.

3. `sitio-hoy-scaffold`
   - Usar cuando el proyecto arranca desde cero.
   - Crea base Next.js, Supabase clients, env validation, cache tags, tokens y scripts QA.

4. `sitio-hoy-database`
   - Usar despues del scaffold y antes de escribir queries.
   - Genera `supabase/migrations/001_initial_schema.sql` con schema completo, RLS y storage.

5. `sitio-hoy-qa`
   - Usar al cerrar cada modulo y antes de deploy.
   - Ejecuta validacion estatica, build, e2e/Lighthouse si existen y genera reporte QA.

6. `sitio-hoy-launch-automation`
   - Usar despues de QA aprobado y antes de publicar/entregar.
   - Genera `.sitiohoy/launch/` con comandos GitHub, Vercel, Supabase, provisioning de tenant/admin y productos demo.

## Regla de handoff

Si una etapa requiere archivos repetibles, scripts o validacion automatica, preferir
la skill especializada antes que reescribir instrucciones desde `sitio-hoy`.

## Gates por etapa

| Etapa | Skill | Gate minimo |
|---|---|---|
| Briefing | `sitio-hoy-briefing` | `sitiohoy.config.json` + `brief.md` |
| Contexto minimo | `sitio-hoy-project-director` | `.sitiohoy/context/` + `.sitiohoy/design/` |
| Inicio tecnico | `sitio-hoy-scaffold` | `npm run build` + `npm run sitiohoy:validate` |
| Base de datos | `sitio-hoy-database` | migracion generada + RLS revisado |
| Modulo visual/publico | `sitio-hoy-qa` | validacion estatica sin errores |
| Checkout | `sitio-hoy-qa` | build + flujo manual/pago test documentado |
| Launch | `sitio-hoy-launch-automation` | repo, tenant/admin, env vars y demo data preparados |
| Deploy | `sitio-hoy-qa` + `sitio-hoy-launch-automation` + `core/15-deploy-vercel.md` | QA report + variables y webhooks verificados |
