---
name: sitio-hoy-qa
description: >
  Ejecutar y automatizar QA de sitios SitioHoy: validacion estatica de reglas
  tecnicas, build, e2e, accesibilidad, Lighthouse y reporte QA. Usar antes de
  cerrar cada modulo y siempre antes de deploy.
---

# SitioHoy QA

Esta skill convierte los checklists de SitioHoy en gates automaticos. Usarla:
- al finalizar cada modulo;
- antes de mostrar avances al cliente;
- antes de deploy;
- cuando haya dudas sobre regresiones tecnicas o visuales.

## Instalacion en un proyecto

Copiar `scripts/` a la raiz del proyecto y agregar al `package.json`:

```json
{
  "scripts": {
    "sitiohoy:brief-from-intake": "node scripts/brief-from-intake.mjs",
    "sitiohoy:validate": "node scripts/validate-sitiohoy.mjs",
    "sitiohoy:preflight": "node scripts/preflight.mjs",
    "sitiohoy:module-close": "node scripts/module-close.mjs",
    "sitiohoy:validate-supabase": "node scripts/validate-supabase-remote.mjs",
    "sitiohoy:secret-scan": "node scripts/secret-scan.mjs",
    "sitiohoy:visual-audit": "node scripts/visual-audit.mjs",
    "sitiohoy:e2e": "playwright test tests/e2e/",
    "sitiohoy:test-supabase": "node scripts/test-supabase.mjs",
    "sitiohoy:test-mercadopago": "node scripts/test-mercadopago.mjs",
    "sitiohoy:test-envia": "node scripts/test-envia.mjs",
    "sitiohoy:test-correo-argentino": "node scripts/test-correo-argentino.mjs",
    "sitiohoy:test-resend": "node scripts/test-resend.mjs",
    "sitiohoy:qa": "node scripts/run-qa.mjs",
    "sitiohoy:qa-report": "node scripts/generate-qa-report.mjs",
    "sitiohoy:audit": "node scripts/audit.mjs"
  }
}
```

Si Playwright o Lighthouse ya existen, `run-qa.mjs` los ejecuta via scripts del proyecto:
- `sitiohoy:e2e`
- `test:e2e` como fallback legacy
- `lighthouse`

Para que `sitiohoy:visual-audit` pueda sacar screenshots:

```bash
npm install -D playwright @playwright/test
npx playwright install chromium
```

## Verificación de Fidelidad al Diseño

Antes de cerrar módulos visuales (1-6):
- Verificar que tokens.css coincide con las especificaciones del DESIGN.md
- Colores, tipografía y espaciado deben ser coherentes con la dirección creativa del DESIGN.md
- Si hay discrepancias, corregir antes de cerrar el módulo
- El DESIGN.md es la fuente de verdad para las especificaciones visuales

## Gates minimos

1. `npm run sitiohoy:preflight` antes de iniciar módulos o después de cambios de alcance.
2. `npm run build`
3. `npm run sitiohoy:validate`
4. `npm run sitiohoy:secret-scan`
5. `SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit` con servidor local activo para módulos visuales y antes de deploy.
6. `SITE_URL=http://localhost:3000 npm run sitiohoy:e2e` antes de deploy.
7. `npm run lighthouse` si existe
8. Smoke tests de integraciones activas cuando existan credenciales: `sitiohoy:test-mercadopago`, `sitiohoy:test-envia`, `sitiohoy:test-correo-argentino`, `sitiohoy:test-resend`.
9. `npm run sitiohoy:qa-report`
10. `npm run sitiohoy:audit` antes de deploy/entrega.

## Performance Budget

El `sitiohoy.config.json` incluye `performanceBudget` con targets por plan:
- **LCP**: ≤1.8s (Empresa) / ≤2.5s (otros)
- **Bundle size**: ≤200KB (Esencial) / ≤350KB (Emprendimiento) / ≤500KB (Empresa)
- **Lighthouse mobile**: ≥90 (Empresa) / ≥80 (otros)
- **Lighthouse desktop**: ≥90 (todos)

Verificar con `npm run lighthouse` y comparar contra estos targets antes de deploy.
Si no se cumple, optimizar antes de continuar (lazy loading, code splitting, image optimization).

## Que valida automaticamente

- no usar `<img>` nativo;
- no usar `revalidatePath('/')`;
- no exponer service role key como publica;
- no usar `createServiceClient` en componentes client;
- `styles/tokens.css` presente;
- `app/layout.tsx` con `next/font`;
- `app/error.tsx` y `app/not-found.tsx` presentes;
- `.env.example` presente;
- reporte JSON en `.sitiohoy/qa/static-report.json`.
- preflight JSON en `.sitiohoy/qa/preflight-report.json`.
- auditoría JSON en `.sitiohoy/audit/audit-report.json` y reporte Markdown `AUDIT-SitioHoy-*.md`.
- checklist machine-readable `.sitiohoy/checklists/module-checks.json`.
- scanner de secretos para evitar tokens en Git.
- auditoría visual responsive con screenshots 375/390/768/1280/1920 en `.sitiohoy/qa/visual/`.
- E2E de flujo real con screenshots 375/768/1280/1920 en `.sitiohoy/qa/e2e/`.
- registro de errores reales corregidos en `.sitiohoy/errores-corregidos.md` para alimentar mejoras futuras de skills.
- validador remoto Supabase si hay `SUPABASE_DB_URL` o env vars de Supabase.

## Cierre de módulo automático

Usar `module-close` para cerrar módulos:

```bash
npm run sitiohoy:module-close -- --modulo 4 --nombre "Checkout y envíos" --checks "cart_persists,shipping_provider_tested,server_totals_recalculated,mercadopago_preference_created,payment_events_logged,order_events_logged,tracking_page_ready,build_ok,validate_ok"
```

El comando valida checks contra `.sitiohoy/checklists/module-checks.json`, corre preflight/build/validación/secret scan, ejecuta `sitiohoy:e2e` como gate obligatorio en módulos de deploy, actualiza tracking y opcionalmente ejecuta auditoría con `--audit`.
Si `sitiohoy:e2e` falla antes del deploy, el cierre queda bloqueado y el bloqueo se registra en `proyecto-tracking.json` con timestamp `-03:00`.

## Paralelización

Estas validaciones no dependen entre sí y pueden ejecutarse simultáneamente:

**Grupo A — validaciones estáticas** (análisis de código, sin servidor):
- Verificar uso de `<img>` nativo vs `next/image`
- Verificar `revalidatePath('/')` global
- Verificar que `SUPABASE_SERVICE_ROLE_KEY` no tenga prefijo `NEXT_PUBLIC_`
- Verificar `createServiceClient` no usado en componentes client
- Verificar presencia de `styles/tokens.css`, `app/error.tsx`, `app/not-found.tsx`, `.env.example`

**Grupo B — validaciones de build** (requiere que el proyecto compile):
- `npm run build`

**Grupo C — validaciones de runtime** (requieren que el build esté listo):
- `SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit`
- `SITE_URL=http://localhost:3000 npm run sitiohoy:e2e`
- `npm run lighthouse`

**Grupo D — reporte** (requiere que A, B y C estén completos):
- `npm run sitiohoy:qa-report`

Orden recomendado: lanzar Grupo A en paralelo con Grupo B.
Cuando B termine, lanzar Grupo C.
Cuando A y C terminen, generar el reporte D.

Si hay múltiples páginas para validar (home, catálogo, detalle, checkout),
cada página puede auditarse con Lighthouse en paralelo. Para visual audit, usar:

```bash
SITE_URL=http://localhost:3000 npm run sitiohoy:visual-audit -- --pages /,/catalogo,/checkout
```

## Como marcar un modulo como terminado

Un modulo solo esta listo si:
- los errores automaticos son 0;
- los warnings tienen decision explicita;
- el reporte QA queda generado;
- la auditoría visual queda OK si el módulo toca UI pública;
- `npm run sitiohoy:audit` no tiene errores antes de deploy;
- `.sitiohoy/errores-corregidos.md` está actualizado si hubo bugs corregidos durante el módulo;
- los puntos manuales criticos estan listados.

Formato sugerido:

```txt
Modulo N OK
Build: OK
SitioHoy QA: OK
Warnings: 0
Reporte: QA-[negocio]-[fecha].md
```
