---
skill: env-vars
descripcion: Variables de entorno completas — qué va en .env vs qué se lee desde la BD en runtime
tipo: core — consultar en Módulo 0 al configurar el proyecto y antes de cualquier deploy
---

# Variables de Entorno

## Principio fundamental

> Las credenciales de cada cliente (MercadoPago, Resend, Envia.com) **NO van en `.env`**.
> Viven en la tabla `tenants` y se leen en runtime con `getTenantConfig()`.
> Las credenciales de acceso de plataforma para Correo Argentino viven en `platform_config`;
> el `customer_id` específico de cada negocio vive en `tenants.correo_argentino_customer_id`.
> `.env` solo tiene infraestructura: Supabase, URL del sitio, y el ID del tenant activo.

### ¿Por qué?
Un mismo proyecto Next.js puede servir a múltiples tenants (o migrarse a otro tenant
sin tocar el código). Las credenciales en BD permiten rotarlas desde el admin sin redeploy.

---

## Variables que SÍ van en `.env.local` / Vercel Dashboard

```env
# ─── SUPABASE ────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # Clave pública — safe para el cliente
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # ⚠️ NUNCA con prefijo NEXT_PUBLIC_

# ─── TENANT ──────────────────────────────────────────────────────
NEXT_PUBLIC_TENANT_ID=uuid-del-tenant         # UUID de la fila en tabla tenants
NEXT_PUBLIC_SITE_NAME=Nombre del Negocio      # Para emails y metadata
NEXT_PUBLIC_URL=https://www.dominio.com.ar    # URL pública sin trailing slash

# ─── MERCADOPAGO (solo infraestructura) ──────────────────────────
MP_WEBHOOK_SECRET=tu_webhook_secret           # Para verificar firma del webhook
                                              # El access_token viene de tenants

# ─── ANALYTICS ───────────────────────────────────────────────────
NEXT_PUBLIC_UMAMI_WEBSITE_ID=uuid-del-sitio   # Del dashboard de Umami
                                              # Preferir tenants.umami_website_id si existe
                                              # La URL del script viene de tenants.umami_url

# ─── ENVIA.COM ───────────────────────────────────────────────────
ENVIA_API_URL=https://api-test.envia.com      # test: api-test.envia.com | prod: api.envia.com
                                              # El access_token viene de tenants
```

---

## Variables que vienen de la BD (NO van en .env)

Estas se obtienen llamando `getTenantConfig(tenantId)` en el server:

| Campo en `tenants` | Uso |
|---|---|
| `url` | URL pública del sitio para triggers ISR Supabase |
| `revalidation_secret` | Secret único por tenant para `/api/revalidate` |
| `mp_access_token` | Crear preferencias y procesar pagos en MercadoPago |
| `mp_public_key` | Inicializar MercadoPago Bricks en el cliente |
| `resend_api_key` | Enviar emails transaccionales con Resend |
| `contact_email` | Email destino del negocio para formularios de contacto |
| `envia_access_token` | Cotizar y generar guías en Envia.com |
| `correo_argentino_customer_id` | Customer ID MiCorreo específico del negocio |
| `umami_url` | URL del script de Umami Analytics |
| `umami_website_id` | Website ID de Umami Analytics |
| `origin_name/phone/address/city/state/postal_code` | Datos de origen para cotización Envia.com |

Estas se obtienen desde `platform_config` con service role, nunca desde `.env`:

| Campo en `platform_config` | Uso |
|---|---|
| `correo_argentino_user` | Usuario MiCorreo de la plataforma |
| `correo_argentino_password` | Password MiCorreo de la plataforma |
| `correo_argentino_token` | Token MiCorreo cacheado |
| `correo_argentino_token_expires_at` | Vencimiento del token |

---

## Función `getTenantConfig()`

```typescript
// lib/supabase/tenant.ts
import { unstable_cache } from 'next/cache'
import { createServiceClient } from './server'
import { TAGS } from '@/lib/cache-tags'

const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!

export const getTenantConfig = unstable_cache(
  async () => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        id, name, slug, plan, status, url, revalidation_secret,
        mp_access_token, mp_public_key,
        resend_api_key, contact_email, envia_access_token,
        correo_argentino_customer_id,
        umami_url, umami_website_id,
        origin_name, origin_phone, origin_address,
        origin_city, origin_state, origin_postal_code
      `)
      .eq('id', tenantId)
      .single()

    if (error || !data) throw new Error('Tenant no encontrado')
    return data
  },
  ['tenant-config'],
  { tags: [TAGS.TENANT] },  // ISR on-demand únicamente — invalidar con revalidateTag(TAGS.TENANT, 'default')
)
```

Agregar `TENANT: 'tenant-config'` en `lib/cache-tags.ts`.

---

## `.env.local` completo por plan

### Plan Esencial

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_TENANT_ID=
NEXT_PUBLIC_SITE_NAME=
NEXT_PUBLIC_URL=
```

### Plan Emprendimiento

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_TENANT_ID=
NEXT_PUBLIC_SITE_NAME=
NEXT_PUBLIC_URL=
MP_WEBHOOK_SECRET=
NEXT_PUBLIC_UMAMI_WEBSITE_ID=       # Si Umami activado
```

### Plan Empresa

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_TENANT_ID=
NEXT_PUBLIC_SITE_NAME=
NEXT_PUBLIC_URL=
MP_WEBHOOK_SECRET=
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
ENVIA_API_URL=https://api-test.envia.com   # Cambiar a producción antes del deploy
CA_API_URL=https://apitest.correoargentino.com.ar/micorreo/v1
```

---

## `.env.example` a incluir en el repo

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Tenant
NEXT_PUBLIC_TENANT_ID=
NEXT_PUBLIC_SITE_NAME=
NEXT_PUBLIC_URL=

# MercadoPago (solo webhook secret — tokens en tabla tenants)
MP_WEBHOOK_SECRET=

# ISR local fallback — en producción preferir tenants.revalidation_secret
REVALIDATION_SECRET=

# Analytics
NEXT_PUBLIC_UMAMI_WEBSITE_ID=

# Envia.com (solo URL base — token en tabla tenants)
ENVIA_API_URL=https://api-test.envia.com

# Correo Argentino MiCorreo (solo URL base — credenciales en platform_config)
CA_API_URL=https://apitest.correoargentino.com.ar/micorreo/v1
```

> ⚠️ `.env.local` va en `.gitignore`. Commitear solo `.env.example`.

---

## Checklist de variables ✅

- [ ] `.env.local` configurado con todas las variables del plan
- [ ] `SUPABASE_SERVICE_ROLE_KEY` sin prefijo `NEXT_PUBLIC_`
- [ ] `NEXT_PUBLIC_TENANT_ID` es el UUID real de la fila en `tenants`
- [ ] `MP_WEBHOOK_SECRET` configurado (Emprendimiento y Empresa)
- [ ] `ENVIA_API_URL` apunta a `api-test.envia.com` en desarrollo
- [ ] `CA_API_URL` apunta a `apitest.correoargentino.com.ar/micorreo/v1` en desarrollo si Correo Argentino está activo
- [ ] Mismas variables cargadas en Vercel Dashboard antes del deploy
- [ ] `.env.example` commiteado, `.env.local` en `.gitignore`
- [ ] `getTenantConfig()` retorna datos correctos (verificar en consola del servidor)
