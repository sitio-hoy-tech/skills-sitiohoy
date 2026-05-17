---
skill: mercadopago
descripcion: MercadoPago Bricks — preferencia server-side, Payment Brick, webhook
tipo: integración — Emprendimiento y Empresa (Módulo 4)
---

# Integración MercadoPago

```bash
npm install mercadopago @mercadopago/sdk-react
```

Credenciales: se leen desde `tenants.mp_access_token` y `tenants.mp_public_key`. No en `.env`.

## Errores conocidos — Payment Brick

| Error | Causa | Fix |
|---|---|---|
| `Amount property is required` | Se pasó `amount: 0` o `undefined` | Pasar el total real del pedido (`subtotal + envío`). Nunca inicializar el Brick con `0`. |
| `property 'fontSizeBase' is not valid` | `fontSizeBase` no existe en `customVariables` | Removerla del objeto de customización. |
| Brick duplicado en dev (React Strict Mode) | `useEffect` corre dos veces | Guardar instancia en `useRef`; al inicio `if (brickRef.current) return`; en cleanup: `brickRef.current?.unmount?.(); brickRef.current = null`. |
| `auto_return invalid` | `auto_return: 'approved'` con `back_urls` en `http://` | Aplicar `auto_return` solo cuando `BASE_URL.startsWith('https://')`. |
| Brick muestra "no configurado" | `process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` vacío en Client Component | Leer `mp_public_key` con `getTenantConfig()` en Server Component y pasarla como prop. |

---

## Server Action — crear preferencia

```typescript
// app/(public)/checkout/actions.ts
'use server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantConfig } from '@/lib/supabase/tenant'
import { revalidateTag } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'

const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!

export const createMPPreference = async (orderId: string) => {
  const config = await getTenantConfig(tenantId)
  const mpClient = new MercadoPagoConfig({ accessToken: config.mp_access_token! })
  const supabase = createServiceClient()
  const BASE_URL = process.env.NEXT_PUBLIC_URL ?? ''

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(name, variant_name, quantity, unit_price)')
    .eq('tenant_id', tenantId)
    .eq('id', orderId)
    .single()

  if (!order) throw new Error('Pedido no encontrado')

  const items = order.order_items.map((item: any) => ({
    id: item.product_id ?? orderId,
    title: item.variant_name ? `${item.name} — ${item.variant_name}` : item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    currency_id: 'ARS',
  }))

  // Agregar costo de envío como ítem si existe
  if (order.shipping_cost > 0) {
    items.push({
      id: 'envio',
      title: `Envío — ${order.shipping_carrier ?? 'Envío'}`,
      quantity: 1,
      unit_price: order.shipping_cost,
      currency_id: 'ARS',
    })
  }

  const preference = new Preference(mpClient)
  const result = await preference.create({
    body: {
      items,
      payer: { email: order.payer_email ?? '' },
      notification_url: BASE_URL.startsWith('https://') ? `${BASE_URL}/api/webhooks/mercadopago` : undefined,
      back_urls: BASE_URL
        ? {
            success: `${BASE_URL}/checkout/success`,
            failure: `${BASE_URL}/checkout/error`,
            pending: `${BASE_URL}/checkout/pending`,
          }
        : undefined,
      ...(BASE_URL.startsWith('https://') ? { auto_return: 'approved' } : {}),
      external_reference: order.id,
      statement_descriptor: process.env.NEXT_PUBLIC_SITE_NAME,
    },
  })

  return { preferenceId: result.id! }
}
```

## Server Component — pasar Public Key al cliente

En proyectos multitenant, no leer `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` desde Client Components:
puede estar vacío aunque el tenant esté configurado. Leer desde servidor.

```tsx
// app/(public)/checkout/page.tsx
import { getTenantConfig } from '@/lib/supabase/tenant'
import { CheckoutSteps } from './CheckoutSteps'

export default async function CheckoutPage() {
  const tenant = await getTenantConfig(process.env.NEXT_PUBLIC_TENANT_ID!)
  return <CheckoutSteps mpPublicKey={tenant.mp_public_key ?? ''} />
}
```

```tsx
// ❌ Client Component — puede devolver ''
const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
```

## Client Component — Payment Brick

```typescript
// components/checkout/PaymentBrick.tsx
'use client'
import { useEffect, useState } from 'react'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'

interface Props {
  preferenceId: string
  amount: number
  mpPublicKey: string
  onSuccess: (paymentId: string) => void
  onError: (error: unknown) => void
}

export const PaymentBrick = ({ preferenceId, amount, mpPublicKey, onSuccess, onError }: Props) => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!mpPublicKey) {
      onError(new Error('MercadoPago Public Key no configurada.'))
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      onError(new Error('El total del pedido debe ser mayor a cero.'))
      return
    }
    initMercadoPago(mpPublicKey, { locale: 'es-AR' })
    setReady(true)
  }, [amount, mpPublicKey, onError])

  if (!ready) return <PaymentSkeleton />

  return (
    <Payment
      initialization={{ amount, preferenceId, payer: { email: '' } }}
      customization={{
        visual: {
          style: {
            theme: 'default',
            customVariables: {
              baseColor: 'var(--color-primary)',
              borderRadiusFull: 'var(--radius-md)',
            },
          },
          hideFormTitle: true,
        },
        paymentMethods: {
          creditCard: 'all', debitCard: 'all',
          mercadoPago: 'all', atm: 'all', ticket: 'all',
        },
      }}
      onSubmit={async ({ formData }) => {
        const res = await fetch('/api/checkout/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formData }),
        })
        const { paymentId, status } = await res.json()
        if (status === 'approved' || status === 'in_process') onSuccess(paymentId)
        else onError(new Error(`Estado: ${status}`))
      }}
      onError={onError}
    />
  )
}
```

## API route — procesar pago

```typescript
// app/api/checkout/payment/route.ts
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantConfig } from '@/lib/supabase/tenant'
import { revalidateTag } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
  const config = await getTenantConfig(tenantId)
  const mpClient = new MercadoPagoConfig({ accessToken: config.mp_access_token! })

  const { formData } = await req.json()
  const payment = new Payment(mpClient)
  const result = await payment.create({
    body: { ...formData },
    requestOptions: { idempotencyKey: formData.external_reference },
  })

  if (result.status === 'approved') {
    revalidateTag(TAGS.ORDER(result.external_reference!), 'default')
    revalidateTag(TAGS.ORDERS, 'default')
  }

  return NextResponse.json({
    paymentId: result.id,
    status: result.status,
    statusDetail: result.status_detail,
  })
}
```

## Webhook MercadoPago

```typescript
// app/api/webhooks/mercadopago/route.ts
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantConfig } from '@/lib/supabase/tenant'
import { revalidateTag } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'

const STATUS_MAP: Record<string, string> = {
  approved: 'confirmed',
  pending: 'pending',
  in_process: 'pending',
  rejected: 'cancelled',
}

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  // VERIFICACIÓN DE FIRMA — OBLIGATORIA, no opcional
  const webhookSecret = process.env.MP_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[MP Webhook] MP_WEBHOOK_SECRET no configurado — request rechazado')
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 })
  }

  const rawBody = await req.text()
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')

  if (xSignature) {
    // Verificación de firma HMAC-SHA256 según docs de MercadoPago
    const parts = Object.fromEntries(xSignature.split(',').map(p => p.trim().split('=')))
    const ts = parts['ts']
    const v1 = parts['v1']
    const dataId = new URL(req.url).searchParams.get('data.id') ?? ''
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const { createHmac } = await import('node:crypto')
    const expected = createHmac('sha256', webhookSecret).update(manifest).digest('hex')
    if (v1 !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  }

  const body = JSON.parse(rawBody)
  if (body.type !== 'payment') return NextResponse.json({ received: true })

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
  const config = await getTenantConfig(tenantId)
  const mpClient = new MercadoPagoConfig({ accessToken: config.mp_access_token! })

  const payment = new Payment(mpClient)
  const paymentData = await payment.get({ id: body.data.id })
  const orderId = paymentData.external_reference
  if (!orderId) return NextResponse.json({ error: 'Sin referencia' }, { status: 400 })

  const supabase = createServiceClient()
  await supabase.from('payment_events').insert({
    tenant_id: tenantId,
    order_id: orderId,
    provider: 'mercadopago',
    provider_event_id: String(paymentData.id),
    status: paymentData.status,
    payload: paymentData,
  })

  await supabase
    .from('orders')
    .update({
      payment_status: paymentData.status,
      status: STATUS_MAP[paymentData.status!] ?? 'pending',
      mp_payment_id: String(paymentData.id),    // ← columna correcta: mp_payment_id
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('tenant_id', tenantId)

  revalidateTag(TAGS.ORDER(orderId), 'default')
  revalidateTag(TAGS.ORDERS, 'default')

  return NextResponse.json({ received: true })
}
```

## Testing local de webhooks

Para testear webhooks sin hacer compras reales:

```bash
# Asegurarse de que el servidor está corriendo
npm run dev

# En otra terminal, simular todos los eventos
SITE_URL=http://localhost:3000 npm run sitiohoy:test-webhooks

# O un evento específico
SITE_URL=http://localhost:3000 node scripts/test-webhooks-local.mjs --event payment.approved
```

Eventos simulables:
- `payment.approved` — pago acreditado
- `payment.rejected` — pago rechazado
- `payment.pending` — pago pendiente
- `payment.refunded` — reembolso

El script envía payloads con `_test: true` para que el handler pueda diferenciar webhooks reales de simulados en development.

## Verificación ✅

- [ ] Credenciales TEST configuradas en `tenants` para desarrollo
- [ ] Payment Brick renderiza en checkout
- [ ] Pago con tarjeta de prueba es aprobado
- [ ] Webhook actualiza `orders.status` y `orders.mp_payment_id` correctamente
- [ ] Webhook guarda payload en `payment_events`
- [ ] Webhook actualiza filtrando por `id` y `tenant_id`
- [ ] Credenciales cambiadas a PRODUCCIÓN antes del deploy final
- [ ] Webhook apunta a URL de producción
