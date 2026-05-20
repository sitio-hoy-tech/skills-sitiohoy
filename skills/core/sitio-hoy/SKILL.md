---
name: sitio-hoy
description: >
  Genera sitios web completos bajo los planes de SitioHoy (Esencial, Emprendimiento, Empresa).
  Next.js 15+ App Router, Supabase multitenant con RLS, MercadoPago Bricks, Resend, Envia.com,
  Umami Analytics. ISR on-demand con cache tags quirúrgicos. SEO optimizado para IA y buscadores.
  Compatible con Claude Code, Cursor, Windsurf, VS Code + Copilot y cualquier IA del mercado.
  Usar cuando el cliente diga: "comenzar", "crear sitio", "nuevo proyecto", "arrancar",
  "nuevo sitio web", "iniciar desarrollo", "quiero un sitio".
user-invokable: true
argument-hint: "[nombre del negocio o plan]"
metadata:
  author: SitioHoy
  version: "2.0.0"
  category: web-development
---

# SitioHoy — Sistema de Generación de Sitios Web

## Activación

Al invocar este skill:
1. Cargar `core/10-modo-silencioso.md` — activar inmediatamente
2. Cargar `core/00-rol-identidad.md` — establecer identidad y mentalidad
3. Cargar `core/18-skills-especializadas.md` — mapa de skills auxiliares
4. Ejecutar el **Protocolo de Inicio** a continuación

---

## Protocolo de Inicio

### Paso 1 — Briefing y Config del Proyecto (PRIMERO)

Usar `sitio-hoy-briefing`. **No hacer preguntas por consola — siempre abrir el formulario web.**

1. Buscar `briefing-server.mjs` en las carpetas de skills del proyecto:
   - `.claude/skills/sitio-hoy-briefing/scripts/briefing-server.mjs`
   - `.agents/skills/sitio-hoy-briefing/scripts/briefing-server.mjs`
   - `.opencode/skills/sitio-hoy-briefing/scripts/briefing-server.mjs`
2. Correr `node <ruta>/briefing-server.mjs` desde la raíz del proyecto.
3. El servidor abre `http://localhost:3456` automáticamente.
4. Esperar a que el cliente complete y envíe el formulario.
5. El servidor genera `.sitiohoy/intake.json` y `sitiohoy.config.json` automáticamente.
   - Si el cliente ya existe en el sistema (`clientStatus = "existente"`), el formulario pedirá el `existingTenantId`.
   - **No crear un nuevo tenant** si `existingTenantId` está presente — usar el existente.
6. Cuando el cliente confirme que envió el formulario, verificar que el servidor se cerró:
   - el script debe terminar solo después del submit;
   - si sigue vivo, detenerlo con `Ctrl+C` o cerrar el proceso antes de continuar;
   - no dejar servidores de briefing corriendo en segundo plano.
7. Validar que `brief.md` exista. Si no existe, generarlo desde `.sitiohoy/intake.json` antes de avanzar.
8. Usar `sitio-hoy-project-director` (OBLIGATORIO) para generar context packs y dirección visual:
   - `.sitiohoy/context/`
   - `.sitiohoy/design/`
9. Con `sitiohoy.config.json`, determinar qué plan importar.

### Paso 2 — Importar archivos del plan

Según el plan detectado en el onboarding:

```
Plan Esencial      → leer plans/esencial/INDEX.md
Plan Emprendimiento → leer plans/emprendimiento/INDEX.md
Plan Empresa       → leer plans/empresa/INDEX.md
```

El INDEX.md de cada plan lista exactamente qué archivos cargar y en qué orden.
**Cargar solo los archivos del plan activo — no cargar integraciones innecesarias.**

### Paso 2.5 — Diseño (generación directa por el modelo AI)

1. Verificar que `.sitiohoy/design/DESIGN.md` existe (generado por briefing).
2. DESIGN.md contiene: paleta, tipografía, layout, componentes, páginas.
3. El modelo AI usa DESIGN.md como **dirección creativa**, no como spec rígida.
4. Generar design tokens en `styles/tokens.css` (CSS custom properties).
5. Libertad creativa total: diseños únicos, modernos y hermosos.
6. Las referencias de ckm-design (logo-color-psychology, etc.) sirven como guía.
7. No copiar templates genéricos — cada sitio debe tener personalidad única.

**Artefactos generados:**
- `styles/tokens.css` — variables CSS (colores, tipografía, espaciado, radios)
- Componentes UI directamente en código (TSX + Tailwind + tokens CSS)
- Sin dependencia de herramientas externas de diseño

### Paso 3 — Scaffold y base técnica

Si el proyecto arranca desde cero:

1. Leer `.sitiohoy/context/module-0.md`.
2. Usar `sitio-hoy-scaffold` para crear la base Next.js + Supabase + QA scripts.
3. Usar `sitio-hoy-database` para generar migración inicial, RLS, storage y seeds.
4. Aplicar todo lo que se suba a Supabase con Supabase CLI:
   - migraciones y seeds: `supabase db push`;
   - tipos: `supabase gen types typescript`;
   - storage/assets: `supabase storage` cuando corresponda.
   No usar SQL Editor, Dashboard ni pegado manual salvo bloqueo explícito de CLI documentado en tracking.
5. Si falta `brief.md`, ejecutar `npm run sitiohoy:brief-from-intake`.
6. Ejecutar `npm run sitiohoy:preflight`, `npm run sitiohoy:secret-scan`, `npm run build` y `npm run sitiohoy:validate` antes de escribir UI.

Si el proyecto ya existe, inspeccionar primero y aplicar solo los faltantes.

### Paso 4 — Comprensión Profunda del Brief y Diseño

**CRÍTICO: La IA debe entender completamente el proyecto antes de implementar.** No basta con leer el brief — hay que comprenderlo.

Leer `brief.md` y verificar que tiene:
- negocio, audiencia y tono;
- identidad visual;
- catálogo;
- páginas;
- contacto y redes;
- assets faltantes.

**Después de leer, analizar:**
1. ¿La propuesta de valor del negocio es clara? ¿Se entiende qué venden y a quién?
2. ¿Hay inconsistencias? (ej: dice "joyería premium" pero el tono es "juvenil")
3. ¿Faltan datos que impactan el diseño? (ej: no hay colores definidos, no hay logo)
4. ¿El catálogo tiene sentido con el plan? (ej: 500 productos en Plan Esencial que permite 50)

**Si hay dudas o inconsistencias:** preguntar ANTES de empezar a diseñar. Una pregunta bien hecha ahora ahorra una reescritura después. Pero si todo está claro, avanzar sin preguntar.

Leer `.sitiohoy/copy-guide.md` para mantener consistencia de tono y copy en todos los módulos.

Si faltan datos del brief, completar desde `.sitiohoy/intake.json`. Si sigue faltando algo bloqueante
para MercadoPago, Correo Argentino, Envia.com, dominio, productos, peso/envíos o contacto, pedir solo ese dato
y registrar el bloqueo en `proyecto-tracking.json`.

Con ese brief, derivar las decisiones de diseño en `core/04-design-system.md`.
Para ahorrar tokens, preferir cargar `.sitiohoy/design/inspiration-board.md`,
`.sitiohoy/design/design-direction.md` y `.sitiohoy/design/layout-recipe.md`
antes que todo `core/04-design-system.md`.

### Paso 5 — Confirmar assets, productos y ejecutar módulos

Verificar que `_assets-cliente/` tiene las imágenes antes de Módulo 1.
Si el cliente no mandó imágenes de productos, cargar los productos indicados con imágenes de Unsplash
relacionadas al rubro, categoría y nombre del producto. Registrar fuente/keyword usada en tracking.
Para productos físicos, confirmar que el catálogo tenga `weight_grams`; si no se informó peso, usar un
default conservador por rubro, marcarlo como estimado y dejarlo explícito en tracking para auditoría.
Ejecutar los módulos del plan secuencialmente según el archivo `modulos.md` correspondiente.
No avanzar al siguiente módulo sin checklist ✅ completo, sin pasar `sitio-hoy-qa` y, en módulos
visuales, sin `SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit` con screenshots revisados.

### Paso 6 — Reporte QA

Al terminar todos los módulos, usar `sitio-hoy-qa` para ejecutar los gates automáticos
y generar `QA-[nombre-negocio]-[YYYY-MM-DD].md` en la raíz del proyecto. Luego leer
`core/11-qa-checklist.md` para completar los pendientes manuales.
Antes de deploy/entrega, ejecutar también `SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit`
y `npm run sitiohoy:audit`; resolver cualquier error.

### Paso 7 — Launch, Tenant y Deploy

Usar `sitio-hoy-launch-automation` solo cuando QA esté aprobado o documentado.

1. Generar `.sitiohoy/launch/` con plan, comandos, env vars, provisioning y demo data.
2. Crear repo GitHub en la organización indicada y hacer push inicial.
3. Aplicar migraciones Supabase.
4. Si `clientStatus` es `nuevo`: crear fila `tenants`, usuario admin y relación `user_tenants`.
   - Si `clientStatus` es `existente` y hay `existingTenantId`: **no crear tenant** — usar el existente y solo actualizar configuración/datos según el intake.
5. Cargar productos demo si todavía no hay catálogo real.
6. Importar en Vercel, cargar env vars, deploy preview y deploy production.
7. Completar `core/15-deploy-vercel.md` antes del go-live.

---

## Reglas permanentes

**Comportamiento:**
- Modo silencioso activo en todo momento
- Una pregunta → nunca volver a pedir lo ya dado
- Solo hablar ante: error crítico / dato faltante / fin de módulo / bloqueo externo
- **DESIGN.md obligatorio**: el modelo AI usa DESIGN.md como dirección creativa para generar diseños directamente en código. Sin DESIGN.md no hay diseño, sin diseño no hay implementación UI.
- **Crédito de agencia**: usar siempre el componente `<AgencyCredit />` (`components/ui/agency-credit.tsx`) en el footer. Muestra "Desarrollado por" + logo SitioHoy con link a `sitiohoy.com.ar`. No copiar JSX inline en cada plan.
- **Productos destacados**: siempre `LIMIT 8` hardcodeado en la query de `featured = true`. Si el cliente quiere cambiar el límite, se modifica en el código.
- Formato de fin de módulo: `Módulo N ✅ · Listo para N+1`
- **Protocolo de cierre de módulo** (OBLIGATORIO antes de avanzar):
  1. Ejecutar las gates automáticas (`build`, `validate`, `visual-audit` si aplica)
  2. **Listar pruebas manuales** que el usuario debe realizar para validar el módulo. Ejemplos:
     - Módulo 1 (Layout): "Revisá el header/footer en mobile y desktop. Probá el menú hamburguesa."
     - Módulo 2 (Home): "Mirá el home en localhost:3000 y aprobá el diseño. Si querés cambios, decime."
     - Módulo 3 (Catálogo): "Probá los filtros, la paginación, y abrí un producto. ¿Se ve bien la galería?"
     - Módulo 4 (Checkout): "Hacé una compra de prueba con tarjeta de test. Verificá que el webhook actualice el pedido."
     - Módulo 5 (Páginas): "Revisá las páginas opcionales. Probá el formulario de contacto."
     - Módulo 6/7 (Deploy): "Verificá el sitio en producción. Revisá Lighthouse, sitemap, Schema.org."
  3. **Listar configuraciones necesarias para el próximo módulo**. Ejemplos:
     - "Para Módulo 4 vas a necesitar: credenciales de MercadoPago (test), MP_WEBHOOK_SECRET en .env.local"
     - "Para Módulo 7 vas a necesitar: credenciales de MP producción, dominio configurado"
  4. Esperar confirmación del usuario antes de avanzar al siguiente módulo
- Al finalizar cada módulo: ejecutar `npm run sitiohoy:tracking -- --modulo N --nombre "Nombre"` para actualizar `proyecto-tracking.json` automáticamente
- En ese tracking, completar `--checks` con los IDs cumplidos de `.sitiohoy/checklists/module-checks.json`
- Preferir cerrar módulos con `npm run sitiohoy:module-close -- --modulo N --nombre "Nombre" --checks "..."` para que tracking, checks y QA queden sincronizados.
- Al finalizar cada módulo: ejecutar `npm run sitiohoy:validate` o justificar por qué no aplica
- Al finalizar módulos visuales: ejecutar `SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit`, revisar screenshots 375/390/768/1280/1920 y registrar resultado en tracking.
- Al finalizar módulos críticos de pagos/envíos/deploy: ejecutar `npm run sitiohoy:audit` o justificar por qué todavía no aplica
- Al finalizar cada módulo: actualizar `README.md` si el módulo agrega una integración, patrón clave, variable de entorno o página nueva que no esté documentada. No reescribir secciones que no cambiaron.
- Cada vez que se corrija un error durante una página o módulo, registrarlo en `.sitiohoy/errores-corregidos.md` con fecha `-03:00`, causa, solución y recomendación para skills futuras.
- El tracking debe quedar audit-ready: timestamps ISO con offset Argentina `-03:00`, comandos ejecutados, archivos tocados, decisiones, datos estimados, credenciales pendientes, proveedor de imágenes, resultados de QA y bloqueos externos.
- Antes de marcar cualquier módulo como completo, repasar el checklist del plan activo y confirmar explícitamente MercadoPago, Correo Argentino/Envia.com, Resend, Umami, env vars, RLS y productos según corresponda.

**Técnicas (aplicar siempre sin excepción):**
- Server Components por defecto — `'use client'` solo para estado/efectos/eventos
- Server Actions para mutaciones — no crear API routes innecesarias
- `next/image` siempre — nunca `<img>` nativo
- `next/font` siempre — nunca `<link>` externo para fuentes
- `@supabase/ssr` en server — `createBrowserClient` solo en client
- `unstable_cache` + `revalidateTag(tag, 'default')` — nunca `revalidatePath('/')` global
- `error.tsx` y `not-found.tsx` en cada segmento de ruta importante
- `loading.tsx` con skeleton en rutas de datos pesados
- Mobile-first siempre — diseñar desde 375px
- **Filtros obligatorios**: en catálogo y en toda sección donde haya contenido categorizable, incluir filtros visibles y funcionales
- **Submenús en header**: si hay categorías de productos, crear submenús desplegables en la navegación principal (ej: "Productos → [Categoría 1, Categoría 2, ...]"). Aplicar en todos los planes.
- **Paginación obligatoria**: en catálogo y en toda lista de contenido, implementar paginación server-side. Nunca renderizar todos los items de golpe. Usar `LIMIT`/`OFFSET` o cursor-based pagination.
- Supabase CLI siempre para subir cambios a Supabase. El Dashboard queda solo para revisar o recuperar un bloqueo, no como camino normal de ejecución.

**El admin NO se construye en este skill.** El admin es un repositorio separado.
La BD y RLS se configuran completos para que el admin futuro funcione sin modificaciones.

---

## Estructura de archivos

```
core/
  00-rol-identidad.md      — identidad y mentalidad
  01-onboarding-tecnico.md — fallback si no está sitio-hoy-briefing
  02-briefing.md           — fallback si no está sitio-hoy-briefing
  03-stack-base.md         — stack Next.js + Supabase
  04-design-system.md      — design system, UX/UI, responsive
  05-base-datos.md         — schema BD (FUENTE ÚNICA DE VERDAD)
  06-supabase-rls.md       — RLS multitenant
  07-isr-cache.md          — ISR on-demand
  08-seo.md                — SEO y metadata
  09-arquitectura-base.md  — estructura de carpetas
  10-modo-silencioso.md    — directiva de comportamiento
  11-qa-checklist.md       — reporte QA al final
  12-env-vars.md           — variables de entorno (.env vs BD)
  13-typescript-types.md   — interfaces TypeScript del schema
  14-copy-textos.md        — copy en español argentino por rubro
  15-deploy-vercel.md      — deploy, dominio, MP producción, go-live
  16-tracking-proyecto.md  — registro interno tokens/tiempo/costo por módulo
  17-manejo-errores.md     — error.tsx, not-found.tsx, loading.tsx por segmento
  18-skills-especializadas.md — cuándo delegar briefing, scaffold, database, QA y launch

integraciones/
  ...
  formulario-contacto.md   — todos los planes (si activado en briefing)

plans/
  esencial/
    INDEX.md               — archivos a cargar para este plan
    modulos.md             — Módulos 0-5
  emprendimiento/
    INDEX.md
    modulos.md             — Módulos 0-6
  empresa/
    INDEX.md
    modulos.md             — Módulos 0-7

integraciones/
  mercadopago.md           — Emprendimiento + Empresa
  envios-fijos.md          — solo Emprendimiento
  envia.md                 — solo Empresa
  resend.md                — Emprendimiento + Empresa (opcional)
  umami-avanzado.md        — solo Empresa
  whatsapp.md              — todos los planes
```

---

## Paralelización

### Qué es estrictamente secuencial

El flujo principal es secuencial por dependencia de datos:
Briefing → Scaffold → Database → Módulos → QA → Launch.
No saltear ni paralelizar estos pasos mayores.

### Qué puede ejecutarse en paralelo dentro de cada paso

**Durante el desarrollo de módulos** — los módulos de UI sin dependencia de estado
compartido pueden desarrollarse en simultáneo:

| Se puede parallelizar | Condición |
|---|---|
| Páginas estáticas independientes (About, Contacto, FAQ) | No comparten estado entre sí |
| Componentes de UI del mismo módulo (Hero + FeaturedGrid + Footer) | Cada componente es un archivo separado |
| Generación de datos demo + configuración de tokens de diseño | Son archivos independientes |
| Auditoría Lighthouse de múltiples páginas | Cada página es un check independiente |

**Lo que NO puede paralelizarse:**
- Módulo de catálogo antes de tener el schema de productos en Supabase
- Módulo de checkout antes de tener el carrito
- Deploy antes de QA aprobado
- Cualquier módulo antes de tener `styles/tokens.css` (regla de diseño)

### Hint para la IA

Cuando detectes tareas del mismo módulo que no comparten estado,
podés ejecutarlas en paralelo usando los mecanismos disponibles
en tu plataforma (subagentes, tool calls simultáneas, etc.).
Indicar explícitamente en el plan qué se lanza en paralelo y esperar
a que todas terminen antes de marcar el módulo como completo.

---

## Compatibilidad con IAs — Guía de rutas por entorno

Este skill genera **exactamente el mismo código** en cualquier IA.
Lo que cambia es cómo se ejecutan ciertos pasos de setup. Seguir la ruta correspondiente:

### Operaciones críticas — rutas por entorno

| Operación | Claude Code | Cursor / Windsurf | OpenCode | GPT-4 / Gemini / Codex |
|---|---|---|---|---|
| Aplicar migraciones SQL | `supabase db push` | `supabase db push` en terminal | `supabase db push` en terminal | `supabase db push` en terminal |
| Crear repo GitHub | `gh repo create` vía shell | `gh repo create` en terminal | `gh repo create` en terminal | UI de GitHub + `git remote add origin` |
| Deploy a Vercel | `vercel` CLI o Vercel MCP | `vercel` CLI en terminal | `vercel` CLI en terminal | `vercel` CLI en terminal o UI de Vercel |
| Leer `/cost` de tokens | Comando `/cost` en Claude Code | No disponible — estimar | No disponible — estimar | No disponible — estimar |
| Skills especializadas | Delegación automática | Leer SKILL.md manualmente | Leer SKILL.md manualmente | Leer SKILL.md e instrucciones manualmente |

### Instrucción para cualquier IA — sin MCP

Si tu entorno **no tiene MCP de Supabase**:
1. Ejecutar `node scripts/generate-supabase-migration.mjs` → genera `supabase/migrations/001_initial_schema.sql` y `002_seed_admin.sql`
2. Vincular el proyecto con `supabase link --project-ref PROJECT_REF`
3. Aplicar con `supabase db push`
4. Generar tipos con `supabase gen types typescript --linked > types/database.generated.ts`
5. Credenciales del admin en `credentials.local.json`

No pegar SQL en el Dashboard salvo que `supabase db push` falle por un bloqueo no resoluble. Si ocurre,
dejar constancia del error, comando, fecha `-03:00` y decisión en `proyecto-tracking.json`.

Si tu entorno **no soporta skill delegation**:
- Leer directamente el archivo SKILL.md de la skill indicada y seguir su Workflow
- Todas las skills tienen fallback de ejecución manual explícito

### Skills → archivos equivalentes para IAs sin skill system

| Skill | Archivo equivalente a leer |
|---|---|
| `sitio-hoy-briefing` | `core/01-onboarding-tecnico.md` + `core/02-briefing.md` |
| `sitio-hoy-scaffold` | `sitio-hoy-scaffold/SKILL.md` + copiar `assets/template-next-supabase/` |
| `sitio-hoy-database` | `sitio-hoy-database/SKILL.md` + `scripts/generate-supabase-migration.mjs` |
| `sitio-hoy-qa` | `core/11-qa-checklist.md` + `npm run sitiohoy:validate` |
| `sitio-hoy-launch-automation` | `core/15-deploy-vercel.md` |
| `sitio-hoy-project-director` | `core/04-design-system.md` |

---

## Planes disponibles

| Plan | Precio | Productos | Pagos | Envíos |
|---|---|---|---|---|
| Esencial | $25.000/mes | Hasta 50 | No (WhatsApp) | No |
| Emprendimiento | $37.000/mes | Hasta 200 | MercadoPago | Zonas fijas |
| Empresa | $65.000/mes | Ilimitados | MercadoPago | Envia.com |
