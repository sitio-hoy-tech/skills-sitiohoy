---
skill: plan-emprendimiento-index
descripcion: Plan Emprendimiento — archivos a importar y orden de ejecución
tipo: plan — cargar después del onboarding técnico cuando plan = emprendimiento
---

# Plan Emprendimiento — Índice

**$37.000/mes** · Hasta 200 productos · MercadoPago · Envíos con zonas fijas · Analytics básico

## Integraciones activas

| Integración | Activa |
|---|---|
| MercadoPago Bricks | ✅ |
| Envíos por zona fija | ✅ |
| Envia.com | ❌ |
| Resend emails | ✅ (si activado en onboarding) |
| Umami Analytics | ✅ (básico) |
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
plans/emprendimiento/modulos.md ← diferencias específicas de este plan
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
core/05-base-datos.md           ← incluye tabla shipping_zones
core/06-supabase-rls.md
core/13-typescript-types.md     ← copiar a types/database.ts en este módulo
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
integraciones/envios-fijos.md
integraciones/resend.md         ← solo si Resend activo en sitiohoy.config.json
```

### CARGAR AL INICIO DE CADA MÓDULO si aplica
```
integraciones/whatsapp.md
integraciones/formulario-contacto.md ← si "página de contacto" fue seleccionada
```

### CARGAR AL FINAL (QA y Deploy)
```
core/11-qa-checklist.md
core/15-deploy-vercel.md
```

---

## Lo que incluye este plan

- Todo lo del Plan Esencial
- Carrito de compras persistente (localStorage + Zustand)
- Checkout multi-step: datos → envío (zonas fijas) → pago (MercadoPago Bricks)
- Webhook MercadoPago con verificación de firma
- Página de seguimiento de pedido por tracking_token
- Cupones de descuento server-side
- Umami Analytics básico (visitas y tráfico)
- Hasta 200 productos

## Lo que NO incluye

- Envíos automatizados con Correo Argentino (eso es Plan Empresa)
- Panel de administración (repositorio separado)
