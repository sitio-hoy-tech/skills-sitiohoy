---
skill: plan-esencial-index
descripcion: Plan Esencial — archivos a importar y orden de ejecución
tipo: plan — cargar después del onboarding técnico cuando plan = esencial
---

# Plan Esencial — Índice

**$25.000/mes** · Hasta 50 productos · Sin pagos online · Contacto por WhatsApp

## Integraciones activas

| Integración | Activa |
|---|---|
| MercadoPago | ❌ |
| Envíos | ❌ |
| Resend | ❌ |
| Umami Analytics | ❌ |
| WhatsApp redirect | ✅ (botón en productos) |

---

## Carga progresiva — cargar solo cuando se necesita

### CARGAR AHORA (inicio de sesión)
```
core/00-rol-identidad.md        ← identidad y mentalidad
core/10-modo-silencioso.md      ← comportamiento — ejecutar sin pedir confirmación
core/18-skills-especializadas.md ← mapa de skills y dónde encontrarlas
plans/modulos-shared.md         ← pasos y verificaciones comunes a todos los planes
plans/esencial/modulos.md       ← diferencias específicas de este plan
```

### CARGAR EN MÓDULO 0 — Setup técnico
```
core/03-stack-base.md           ← stack, clientes Supabase, next.config.ts
core/12-env-vars.md             ← variables de entorno y getTenantConfig()
core/16-tracking-proyecto.md    ← inicializar proyecto-tracking.json
```

### CARGAR EN MÓDULO 0 — Identidad visual
```
core/04-design-system.md        ← design system, tipografía, tokens, paletas
```

### CARGAR EN MÓDULO 0 — Base de datos (usar sitio-hoy-database)
```
core/05-base-datos.md           ← schema completo — leer ANTES de cualquier query
core/06-supabase-rls.md         ← RLS multitenant — leer al aplicar migraciones
core/13-typescript-types.md     ← copiar a types/database.ts en este módulo
```

### CARGAR EN MÓDULO 1 — Layout y manejo de errores
```
core/17-manejo-errores.md       ← error.tsx, not-found.tsx, loading.tsx shimmer
```

### CARGAR EN MÓDULOS 2-3 — Home y catálogo
```
core/07-isr-cache.md            ← unstable_cache, revalidateTag, tabla de invalidaciones
core/08-seo.md                  ← generateMetadata(), Schema.org, sitemap, robots
core/09-arquitectura-base.md    ← estructura de carpetas
core/14-copy-textos.md          ← copy en español argentino por rubro
```

### CARGAR AL INICIO DE CADA MÓDULO si el plan tiene contacto
```
integraciones/whatsapp.md       ← CTA principal de este plan
integraciones/formulario-contacto.md ← si "página de contacto" fue seleccionada
```

### CARGAR AL FINAL (QA y Deploy)
```
core/11-qa-checklist.md         ← generar reporte QA
core/15-deploy-vercel.md        ← pasos de deploy antes de entregar
```

---

## Lo que incluye este plan

- Home con hero + secciones de conversión + CTA hacia WhatsApp
- Catálogo hasta 50 productos con filtros por categoría
- Página de detalle de producto con galería y botón "Consultar por WhatsApp"
- Páginas opcionales: Sobre nosotros, FAQ, Contacto, etc.
- SEO completo (metadata, Schema.org, sitemap, robots)
- Design system único generado en Módulo 0
- Responsive mobile-first desde 375px

## Lo que NO incluye

- Carrito de compras
- Checkout o pasarela de pagos
- Tracking de pedidos
- Panel de administración (repositorio separado)
