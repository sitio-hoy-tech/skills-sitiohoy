---
name: sitio-hoy-scaffold
description: >
  Crear el proyecto base de un sitio SitioHoy desde cero con Next.js App Router,
  Supabase, tokens de diseño, estructura de carpetas, env validation, cache tags
  y scripts de validacion inicial. Usar despues del briefing cuando ya existe
  plan activo y brief del negocio.
---

# SitioHoy Scaffold

Usar esta skill para iniciar un sitio nuevo despues de definir:
- plan: `esencial`, `emprendimiento` o `empresa`
- nombre del negocio
- dominio o URL temporal
- tenant id
- integraciones activas

## Resultado esperado

Crear una base consistente antes de escribir UI:
- Next.js 15+ App Router con TypeScript strict
- Supabase clients server/service
- `lib/cache-tags.ts`
- `app/api/revalidate/route.ts` con secret por tenant
- `lib/config/env.ts`
- `lib/resend/client.ts` (todos los planes con Resend activo)
- `lib/data/shipping.ts` (Plan Emprendimiento y Empresa)
- `lib/envia/provinces.ts` (Plan Empresa con Envia activo)
- `lib/validations/contact.ts` (si página de contacto activa)
- `styles/tokens.css`
- `sitiohoy.config.json`
- `.sitiohoy/checklists/module-checks.json`
- `.sitiohoy/errores-corregidos.md`
- `.env.example`
- scripts de QA base
- scripts operativos: `brief-from-intake`, `preflight`, `module-close`, `secret-scan`, `visual-audit`, `sitiohoy:e2e`, `audit`, smoke tests de integraciones y validador remoto Supabase

## Pre-requisito: DESIGN.md (BLOQUEANTE)

Antes de comenzar módulos de UI (1-6):
1. Verificar que `.sitiohoy/design/DESIGN.md` existe (generado automáticamente por el briefing)
2. El modelo AI usa DESIGN.md como dirección creativa para generar diseños directamente en código
3. Si DESIGN.md no existe, **BLOQUEAR** e informar al usuario:
   > "Falta el DESIGN.md. Ejecutar el briefing para generarlo antes de continuar con la implementación."

## Workflow

1. Si el proyecto esta vacio, crear Next con:
   ```bash
   npx create-next-app@latest ./ --typescript --app --tailwind --src-dir=false --import-alias="@/*"
   ```
2. Copiar el contenido de `assets/template-next-supabase/` en la raiz del proyecto.
3. Instalar dependencias base:
   ```bash
   npm install @supabase/ssr @supabase/supabase-js lucide-react zod@^3.24.0
   ```
4. Si plan es `emprendimiento` o `empresa`, instalar:
   ```bash
   npm install mercadopago @mercadopago/sdk-react react-hook-form @hookform/resolvers zustand
   ```
5. Si Resend esta activo:
   ```bash
   npm install resend
   ```
6. Instalar auditoría visual:
   ```bash
   npm install -D playwright @playwright/test
   npx playwright install chromium
   ```
7. Si el cliente subió assets en `_assets-cliente/`, optimizarlos:
   ```bash
   npm install -D sharp  # opcional pero recomendado
   npm run sitiohoy:optimize-assets
   ```
   Esto genera `public/assets/` con imágenes en WebP, redimensionadas a max 1920px, y un reporte en `.sitiohoy/asset-report.json`.
8. Agregar el script E2E del scaffold:
   ```json
   "sitiohoy:e2e": "playwright test tests/e2e/"
   ```
8. Crear `sitiohoy.config.json` con plan, negocio e integraciones.
9. Completar `.env.local` desde `.env.example`.
10. Ejecutar en orden:
   ```bash
   npm run sitiohoy:validate-config   # Valida sitiohoy.config.json antes de todo
   npm run sitiohoy:brief-from-intake # Genera brief.md si falta y existe intake
   npm run sitiohoy:preflight         # Bloquea si faltan brief, Supabase CLI, peso/envíos o integraciones críticas
   npm run sitiohoy:secret-scan       # Bloquea secretos en archivos commiteables
   npm run build
   npm run sitiohoy:validate
   ```
   Cuando haya UI visible y servidor local activo, ejecutar también:
   ```bash
   SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit
   SITE_URL=http://localhost:3000 npm run sitiohoy:e2e
   ```

### Generación de tokens desde DESIGN.md

El modelo AI genera los tokens directamente a partir de DESIGN.md:
1. Leer DESIGN.md y extraer las especificaciones de diseño
2. Generar `styles/tokens.css` con las CSS custom properties:
   - Colors → `--color-*`
   - Spacing → `--space-*`  
   - Typography → `--font-*`, `--text-*`
   - Radius → `--radius-*`
3. El DESIGN.md contiene todos los tokens esperados — usarlos como guía
4. Libertad creativa para mejorar o complementar lo especificado

## Reglas

- No escribir componentes visuales antes de tener `styles/tokens.css`.
- No cerrar módulos visuales sin `.sitiohoy/qa/visual-report.json` OK y screenshots 375/390/768/1280/1920 revisados.
- No deployar sin `SITE_URL=http://localhost:3000 npm run sitiohoy:e2e` OK y screenshots 375/768/1280/1920 revisados.
- Los cache tags deben incluir `NEXT_PUBLIC_TENANT_ID`; no usar tags globales como `products` o `homepage`.
- El endpoint `/api/revalidate` valida `Authorization: Bearer <secret>` contra `tenants.revalidation_secret`, con `REVALIDATION_SECRET` solo como fallback local.
- No poner credenciales de MercadoPago, Resend o Envia.com en `.env`.
- No commitear `.env.local` ni `proyecto-tracking.json`.
- Si el proyecto no esta vacio, inspeccionar primero y copiar solo archivos faltantes.
- Copiar también `.sitiohoy/checklists/module-checks.json`; es el checklist machine-readable que QA/auditoría usa para evitar cierres incompletos.
- Cerrar módulos con `npm run sitiohoy:module-close -- --modulo N --nombre "Nombre" --checks "check_a,check_b"` en vez de cerrar a mano.

## Configuración base obligatoria en app/layout.tsx

- Agregar `suppressHydrationWarning` al `<body>` para evitar falsos errores de hidratación causados por extensiones del browser (ej: ColorZilla, LastPass):
  ```tsx
  <body className="..." suppressHydrationWarning>
  ```

## Configuración base obligatoria en package.json

- Agregar `browserslist` apuntando a browsers modernos para reducir polyfills innecesarios:
  ```json
  "browserslist": [
    "last 2 Chrome versions",
    "last 2 Firefox versions",
    "last 2 Safari versions",
    "last 2 Edge versions"
  ]
  ```

## README inicial

Al terminar el scaffold, generar `README.md` en la raíz con esta estructura mínima:

```markdown
# {Nombre del negocio} — Sitio Web

> {descripción en una línea del negocio y plan}

**Live:** {URL Vercel} · **Repo:** {org/repo}

## Stack
(tabla: Framework / BD / Pagos / Envíos / Emails / Analytics / Deploy)

## Arquitectura
(árbol de carpetas con descripción de cada sección)

## Variables de entorno
(bloque bash con todas las vars del .env.example comentadas)

## Desarrollo local
(comandos: install, cp .env, dev, build, validate)

## Integraciones
(sección por cada integración activa: dónde van las credenciales, qué hace)

## Deploy
(comando vercel + checklist de go-live pendiente)

## Desarrollado por
[SitioHoy](https://sitiohoy.com.ar) — Plan {plan} · {año}
```

## Paralelización

Estas tareas son independientes y pueden ejecutarse simultáneamente:

**Grupo A — instalación de dependencias** (una vez creado el proyecto base):
- Dependencias base (`@supabase/ssr`, `lucide-react`, `zod`, etc.)
- Dependencias de plan (`mercadopago`, `react-hook-form`, `zustand`) — solo si aplica
- Dependencias de Resend — solo si aplica

Las instalaciones pueden resolverse en paralelo si el package manager lo soporta.
Si no, ejecutarlas en el orden del workflow para evitar conflictos de lockfile.

**Grupo B — generación de archivos de configuración** (independientes entre sí):
- `sitiohoy.config.json`
- `.env.example`
- `styles/tokens.css`
- `lib/cache-tags.ts`
- `lib/config/env.ts`
- `lib/resend/client.ts` (si Resend activo)
- `lib/data/shipping.ts` (si plan Emprendimiento o Empresa)
- `lib/envia/provinces.ts` (si plan Empresa con Envia)
- `lib/validations/contact.ts` (si página de contacto)
- `app/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`
- `README.md`

El Grupo B puede generarse en paralelo mientras el Grupo A instala dependencias,
ya que los archivos no requieren que las dependencias estén instaladas para crearse.

## Handoff

Despues del scaffold:
1. usar `sitio-hoy-database` para migraciones, RLS y seeds;
2. usar la skill principal `sitio-hoy` para ejecutar modulos del plan;
3. usar `sitio-hoy-qa` antes de marcar cada modulo como terminado.
