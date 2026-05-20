---
skill: envia
descripcion: Envia.com API — cotización en tiempo real y generación de guías (solo Plan Empresa)
tipo: integración — solo Plan Empresa (Módulo 4, si activado en onboarding)
---

# Integración Envia.com

Credencial: `tenants.envia_access_token` (no en `.env`).
Para productos físicos, usar `products.weight_grams` y dimensiones del producto.
Si el producto no tiene datos propios, usar los defaults de `sitiohoy.config.json`
y registrarlo como estimado en tracking.

```env
# Solo la URL base en .env (ambiente test vs prod)
ENVIA_API_URL=https://api-test.envia.com   # test
# ENVIA_API_URL=https://api.envia.com      # producción
```

## Errores conocidos — leer antes de implementar

| Error | Causa | Fix |
|---|---|---|
| `401` | Token inválido o ambiente incorrecto | Verificar token y que `ENVIA_API_URL` coincida |
| `Array to string conversion` | `carrier` enviado como array | Usar string: `"correoargentino"` |
| `Required property missing: state` | Falta el campo `state` | Agregarlo a origin y destination |
| `Required property missing: postalCode` | Se usó `zip` | El campo es `postalCode` (camelCase) |
| `String is too long` en `state` | Se envió "Buenos Aires" completo | Usar `toProvinceCode()` |

## Provincias argentinas — códigos ISO

```typescript
// lib/envia/provinces.ts
const PROVINCE_MAP: Record<string, string> = {
  "buenos aires": "B", "ciudad autónoma de buenos aires": "C", "caba": "C",
  "córdoba": "X", "cordoba": "X", "santa fe": "S", "mendoza": "M",
  "tucumán": "T", "tucuman": "T", "salta": "A", "entre ríos": "E", "entre rios": "E",
  "misiones": "N", "chaco": "H", "corrientes": "W", "santiago del estero": "G",
  "san juan": "J", "jujuy": "Y", "río negro": "R", "rio negro": "R",
  "neuquén": "Q", "neuquen": "Q", "formosa": "P", "chubut": "U",
  "san luis": "D", "catamarca": "K", "la rioja": "F", "la pampa": "L",
  "santa cruz": "Z", "tierra del fuego": "V",
}

export const toProvinceCode = (province: string): string =>
  PROVINCE_MAP[province.toLowerCase().trim()] ?? province.slice(0, 2).toUpperCase()
```

## Server Action — cotizar envío

```typescript
// lib/envia/client.ts
import { getTenantConfig } from '@/lib/supabase/tenant'
import { toProvinceCode } from './provinces'

const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
const ENVIA_API = `${process.env.ENVIA_API_URL ?? 'https://api.envia.com'}/ship`

export interface ShippingRate {
  carrier: string
  service: string
  serviceDescription: string
  days: number
  totalPrice: number
}

export const getShippingRates = async (destination: {
  name: string
  email?: string
  phone?: string
  address: string
  city: string
  state: string
  postalCode: string
}): Promise<ShippingRate[]> => {
  const config = await getTenantConfig(tenantId)

  if (!config.envia_access_token) return []  // Fallback: sin integración

  const origin = {
    name: config.origin_name ?? '',
    phone: config.origin_phone ?? '',
    address: config.origin_address ?? '',
    city: config.origin_city ?? '',
    state: toProvinceCode(config.origin_state ?? ''),  // ← SIEMPRE convertir
    postalCode: config.origin_postal_code ?? '',
    country: 'AR' as const,
  }

  const dest = {
    ...destination,
    state: toProvinceCode(destination.state),  // ← SIEMPRE convertir
    country: 'AR' as const,
  }

  const res = await fetch(`${ENVIA_API}/rate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.envia_access_token}`,
    },
    body: JSON.stringify({
      origin,
      destination: dest,
      packages: [{ content: 'Productos', amount: 1, type: 'box', weight: 0.5,
        dimensions: { length: 30, width: 20, height: 15 } }],
      shipment: { carrier: 'correoargentino', type: 1 },  // ← string, no array
      settings: { currency: 'ARS' },
    }),
  })

  if (!res.ok) return []
  const data = await res.json()
  return data.data ?? []
}
```

## Fallback en checkout si Envia.com no está configurado

```typescript
// Si getShippingRates devuelve [] → mostrar este mensaje en el checkout
const SHIPPING_FALLBACK = {
  carrier: 'whatsapp',
  service: 'Coordinar envío',
  serviceDescription: 'Te contactamos por WhatsApp para coordinar el envío',
  days: 0,
  totalPrice: 0,
}
```

## Webhook de Envia.com — tracking updates

```typescript
// app/api/webhooks/envia/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendOrderStatusUpdate } from '@/lib/resend/emails/order-status'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

export async function POST(req: NextRequest) {
  // Verificar secret — Envia permite configurar un header custom
  const secret = process.env.ENVIA_WEBHOOK_SECRET
  const auth = req.headers.get('x-envia-secret')
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const trackingNumber = body?.tracking_number ?? body?.trackingNumber
  const status = body?.status

  if (!trackingNumber) {
    return NextResponse.json({ error: 'Missing tracking_number' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Buscar orden por tracking number
  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('tenant_id', TENANT_ID)
    .eq('shipping_tracking_number', trackingNumber)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Registrar evento
  await supabase.from('order_events').insert({
    tenant_id: TENANT_ID,
    order_id: order.id,
    type: 'envia_webhook',
    payload: body,
  })

  // Mapear status de Envia a nuestro status
  const STATUS_MAP: Record<string, string> = {
    'in_transit': 'shipped',
    'delivered': 'delivered',
    'returned': 'cancelled',
  }

  const newStatus = STATUS_MAP[status]
  if (newStatus && newStatus !== order.status) {
    await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id)
      .eq('tenant_id', TENANT_ID)

    // Notificar al comprador si Resend está configurado
    await sendOrderStatusUpdate(order.id, newStatus, trackingNumber, 'Correo Argentino').catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
```

**Seguridad del webhook:**
- `ENVIA_WEBHOOK_SECRET` debe estar en las variables de Vercel (no en `tenants` — es de plataforma, no de tenant)
- Sin el secret, el endpoint responde 401
- Siempre registrar el payload en `order_events` antes de mutar estado
- Actualizar por `id` + `tenant_id` para no afectar otros tenants

## Verificación ✅

- [ ] `envia_access_token` configurado en tabla `tenants`
- [ ] `origin_*` fields configurados en `tenants`
- [ ] Productos físicos tienen `weight_grams` y dimensiones, o defaults estimados registrados
- [ ] Cotización retorna tarifas reales con un código postal de prueba
- [ ] `toProvinceCode()` aplicado en origin y destination antes de la llamada
- [ ] Fallback funciona si la integración no está configurada
- [ ] `ENVIA_WEBHOOK_SECRET` configurado en Vercel
- [ ] Webhook de Envia registrado con URL `{siteUrl}/api/webhooks/envia`
- [ ] Webhook rechaza requests sin secret (401)
