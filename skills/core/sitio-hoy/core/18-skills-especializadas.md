---
skill: skills-especializadas
descripcion: Mapa de skills auxiliares SitioHoy para industrializar briefing, scaffold, base de datos, QA y launch
tipo: core — cargar al inicio junto al orquestador
---

# Skills Especializadas SitioHoy

La skill `sitio-hoy` orquesta el proyecto. Las skills especializadas ejecutan
etapas con mayor determinismo y menos contexto cargado.

---

## Quick Reference

| #  | Skill                        | Proposito                                      | Gate                                                        |
|----|------------------------------|-------------------------------------------------|-------------------------------------------------------------|
| 1  | `sitio-hoy-briefing`         | Onboarding + brief del negocio                  | `sitiohoy.config.json` + `brief.md` generados               |
| 2  | `sitio-hoy-project-director` | Context packs + direccion visual                | `.sitiohoy/context/` + `.sitiohoy/design/` generados        |
| 3  | `sitio-hoy-scaffold`         | Proyecto base Next.js + Supabase                | `npm run build` + `npm run sitiohoy:validate` pasan         |
| 4  | `sitio-hoy-database`         | Migracion SQL + RLS + seeds                     | Migracion generada + RLS revisado                           |
| 5  | `sitio-hoy-qa`               | Validacion estatica, build, e2e, Lighthouse     | Validacion sin errores + reporte QA                         |
| 6  | `sitio-hoy-launch-automation`| Repo, deploy, env vars, tenant, demo data       | Repo, tenant/admin, env vars y demo data preparados         |

---

## Pipeline

```
  BRIEFING          DIRECTOR          SCAFFOLD          DATABASE
 ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
 │ briefing │ ───> │ project- │ ───> │ scaffold │ ───> │ database │
 │          │      │ director │      │          │      │          │
 └──────────┘      └──────────┘      └──────────┘      └──────────┘
      │                 │                  │                 │
      v                 v                  v                 v
  config.json      context packs      proyecto base     migracion SQL
  brief.md         design tokens      env validation    RLS + seeds
                                      cache tags
                                                             │
                           ┌─────────────────────────────────┘
                           v
                     ┌──────────┐                     ┌──────────────┐
                     │    QA    │ ──── aprobado ───> │    LAUNCH     │
                     │          │                     │  automation   │
                     └──────────┘                     └──────────────┘
                          │                                 │
                          v                                 v
                     reporte QA                       repo + deploy
                     build OK                         tenant + admin
                                                      env vars + demo
```

**Regla clave:** cada skill solo se ejecuta si el gate de la skill anterior
esta cumplido. No saltear pasos.

---

## Skills en detalle

---

### 1. `sitio-hoy-briefing`

**Proposito:** Convertir respuestas del cliente en artefactos tecnicos
antes de tocar codigo.

| Campo       | Detalle                                                              |
|-------------|----------------------------------------------------------------------|
| **Input**   | Respuestas del cliente via formulario web o consola                   |
| **Output**  | `sitiohoy.config.json`, `brief.md`, opcional `.sitiohoy/intake.json` |
| **Usar cuando** | Proyecto nuevo, cambio de plan, cambio de alcance              |
| **Gate**    | `sitiohoy.config.json` y `brief.md` existen y son coherentes        |

**Dependencias:** ninguna (punto de entrada del pipeline).

---

### 2. `sitio-hoy-project-director` — OBLIGATORIO

**Proposito:** Generar context packs minimos y direccion visual portable
para que cada modulo cargue solo lo que necesita.

| Campo       | Detalle                                                                       |
|-------------|-------------------------------------------------------------------------------|
| **Input**   | `sitiohoy.config.json` + `brief.md`                                          |
| **Output**  | `.sitiohoy/context/` (project-context, module-N) + `.sitiohoy/design/`       |
| **Usar cuando** | Siempre despues de briefing, antes de scaffold o modulos                 |
| **Gate**    | Directorios `.sitiohoy/context/` y `.sitiohoy/design/` existen con contenido |

**Dependencias:** requiere gate de `sitio-hoy-briefing`.

> **No saltear este paso.** Los modulos dependen de los context packs generados
> aqui. Sin ellos se carga contexto excesivo y se pierde consistencia de diseno.

---

### 3. `sitio-hoy-scaffold`

**Proposito:** Crear proyecto base Next.js con Supabase, tokens, env validation,
cache tags y scripts QA.

| Campo       | Detalle                                                                               |
|-------------|---------------------------------------------------------------------------------------|
| **Input**   | Plan activo, nombre del negocio, dominio, tenant ID, integraciones                    |
| **Output**  | Next.js 15+ App Router, Supabase clients, `lib/cache-tags.ts`, API revalidate, scripts |
| **Usar cuando** | Proyecto arranca desde cero                                                      |
| **Gate**    | `npm run build` y `npm run sitiohoy:validate` pasan sin errores                      |

**Dependencias:** requiere gate de `sitio-hoy-project-director`.

---

### 4. `sitio-hoy-database`

**Proposito:** Generar migracion SQL completa con schema estable para todos
los planes, RLS multitenant, storage y seeds.

| Campo       | Detalle                                                                                     |
|-------------|---------------------------------------------------------------------------------------------|
| **Input**   | `sitiohoy.config.json`, scaffold completado                                                 |
| **Output**  | `supabase/migrations/001_initial_schema.sql`, `002_seed_admin.sql`, triggers ISR on-demand  |
| **Usar cuando** | Despues del scaffold, antes de escribir queries                                         |
| **Gate**    | Migracion generada + RLS revisado                                                           |

**Dependencias:** requiere gate de `sitio-hoy-scaffold`.

---

### 5. `sitio-hoy-qa`

**Proposito:** Convertir checklists en gates automaticos: validacion estatica,
build, e2e, accesibilidad, Lighthouse y reporte QA.

| Campo       | Detalle                                                                 |
|-------------|-------------------------------------------------------------------------|
| **Input**   | Proyecto con modulos implementados                                      |
| **Output**  | Reporte QA, resultados de validacion, Lighthouse scores                 |
| **Usar cuando** | Al cerrar cada modulo, antes de mostrar avances, antes de deploy   |
| **Gate**    | Validacion estatica sin errores + build exitoso                         |

**Dependencias:** se ejecuta multiples veces a lo largo del proyecto.
Para deploy final requiere todos los gates anteriores cumplidos.

---

### 6. `sitio-hoy-launch-automation`

**Proposito:** Automatizar la ultima milla: repo GitHub, deploy Vercel,
env vars, migraciones Supabase, tenant/admin y productos demo.

| Campo       | Detalle                                                                              |
|-------------|--------------------------------------------------------------------------------------|
| **Input**   | `sitiohoy.config.json`, `brief.md`, migracion Supabase, QA aprobado                 |
| **Output**  | `.sitiohoy/launch/` con comandos GitHub, Vercel, Supabase, provisioning y demo data  |
| **Usar cuando** | Despues de QA aprobado, antes de publicar o entregar                             |
| **Gate**    | Repo creado, tenant/admin provisionado, env vars configuradas, demo data cargada     |

**Dependencias:** requiere gates de `sitio-hoy-qa` + `sitio-hoy-database`.

---

## Deploy final

El deploy combina tres fuentes:

```
  sitio-hoy-qa               sitio-hoy-launch-automation        core/15-deploy-vercel.md
  ─────────────               ───────────────────────────        ────────────────────────
  QA report OK          +     Variables y webhooks         +     Guia de deploy Vercel
       │                            │                                   │
       └────────────────────────────┴───────────────────────────────────┘
                                    │
                                    v
                             DEPLOY A PRODUCCION
```

**Gate de deploy:** QA report aprobado + variables de entorno y webhooks
verificados + guia de deploy seguida.

---

## Compatibilidad multi-IA

Las skills se instalan **por proyecto** (no globalmente) en el directorio
correspondiente a cada IA:

| IA           | Directorio de skills                   | Archivo de contexto |
|--------------|----------------------------------------|---------------------|
| Claude Code  | `.claude/skills/<nombre>/SKILL.md`     | `CLAUDE.md`         |
| OpenAI Codex | `.agents/skills/<nombre>/SKILL.md`     | `AGENTS.md`         |
| OpenCode     | `.opencode/skills/<nombre>/SKILL.md`   | `AGENTS.md`         |

**Invocacion universal:** para cualquier IA que no soporte delegacion
automatica, leer directamente el archivo `SKILL.md` de la skill y seguir
su seccion Workflow.

---

## Reglas de handoff

1. **Preferir skill sobre instrucciones manuales.** Si una etapa requiere
   archivos repetibles, scripts o validacion automatica, usar la skill
   especializada en vez de reescribir instrucciones desde `sitio-hoy`.

2. **Verificar gate antes de avanzar.** No iniciar la siguiente skill
   hasta que el gate de la actual este cumplido.

3. **QA es recurrente.** A diferencia de las demas skills que se ejecutan
   una vez, `sitio-hoy-qa` se ejecuta al cerrar cada modulo y antes
   de cualquier deploy.

4. **Project Director es obligatorio.** Nunca pasar de briefing directo
   a scaffold. Los context packs reducen tokens y mejoran consistencia.

5. **Launch requiere QA aprobado.** No generar plan de launch si el QA
   no paso. Primero corregir, despues automatizar deploy.
