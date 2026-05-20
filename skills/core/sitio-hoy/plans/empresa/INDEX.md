---
skill: plan-empresa-index
descripcion: Plan Empresa — archivos a importar y orden de ejecución
tipo: plan — cargar después del onboarding técnico cuando plan = empresa
---

# Plan Empresa — Índice

**$65.000/mes** · Productos ilimitados · MercadoPago · Correo Argentino o Envia.com · Analítica avanzada

## Integraciones activas

| Integración | Activa |
|---|---|
| MercadoPago Bricks | ✅ |
| Correo Argentino (MiCorreo directo) | ✅ (si activado en onboarding) |
| Envia.com (multicarrier) | ✅ (si activado en onboarding) |
| Envíos zona fija | ❌ |
| Resend emails | ✅ (si activado) |
| Umami Analytics avanzado | ✅ (conversiones, e-commerce) |
| Cupones de descuento | ✅ |
| WhatsApp redirect | ✅ |

---

## Carga progresiva — cargar solo cuando se necesita

### CARGAR AHORA (inicio de sesión)
```
core/00-rol-identidad.md
core/10-modo-silencioso.md
core/18-skills-especializadas.md
plans/modulos-shared.md         ← pasos y verificaciones comunes a todos los planes
plans/empresa/modulos.md        ← diferencias específicas de este plan
```

### CARGAR EN MÓDULO 0 — Setup técnico
```
core/03-stack-base.md
core/12-env-vars.md
core/16-tracking-proyecto.md
```

### CARGAR EN MÓDULO 0 — Identidad visual
```
core/04-design-system.md
```

### CARGAR EN MÓDULO 0 — Base de datos (usar sitio-hoy-database)
```
core/05-base-datos.md
core/06-supabase-rls.md
core/13-typescript-types.md
```

### CARGAR EN MÓDULO 1 — Layout y manejo de errores
```
core/17-manejo-errores.md
```

### CARGAR EN MÓDULOS 2-3 — Home y catálogo
```
core/07-isr-cache.md
core/08-seo.md
core/09-arquitectura-base.md
core/14-copy-textos.md
```

### CARGAR ANTES DE MÓDULO 4 — Checkout
```
integraciones/mercadopago.md
integraciones/correo-argentino.md  ← solo si correoArgentino activo en sitiohoy.config.json
integraciones/envia.md             ← solo si envia activo en sitiohoy.config.json
integraciones/envios-fijos.md      ← solo si ninguno de los anteriores activo (fallback zonas fijas)
integraciones/resend.md            ← solo si Resend activo
```

### CARGAR EN MÓDULO 7 — Analytics avanzado
```
integraciones/umami-avanzado.md
```

### CARGAR AL INICIO DE CADA MÓDULO si aplica
```
integraciones/whatsapp.md
integraciones/formulario-contacto.md
```

### CARGAR AL FINAL (QA y Deploy)
```
core/11-qa-checklist.md
core/15-deploy-vercel.md
```

---

## Lo que incluye este plan

- Todo lo del Plan Emprendimiento
- Productos ilimitados
- Envíos automatizados: Correo Argentino directo (pre-registro automático con usuario MiCorreo propio del cliente) o Envia.com (etiquetas PDF, multicarrier — requiere cuenta propia)
- Umami con tracking de conversiones y eventos de e-commerce
- Schema.org avanzado con Review y FAQPage
- SEO para AI Overviews completo

## Lo que NO incluye

- Panel de administración (repositorio separado)
