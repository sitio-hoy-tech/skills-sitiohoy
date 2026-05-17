---
skill: envios-fijos
descripcion: Envíos con zonas de precio fijo — Plan Emprendimiento (sin Envia.com)
tipo: integración — solo Plan Emprendimiento (Módulo 4)
---

# Envíos con Zonas Fijas — Plan Emprendimiento

El cliente configura zonas de envío con precios fijos desde el panel admin. El comprador selecciona su zona en el checkout.

No requiere API externa. Las zonas viven en la tabla `shipping_zones`.

## Fetch de zonas disponibles

```typescript
// lib/data/shipping.ts
import { unstable_cache } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'
import { createServiceClient } from '@/lib/supabase/server'

const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!

export const getShippingZones = unstable_cache(
  async () => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('shipping_zones')
      .select('id, name, description, price')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('position')
    if (error) console.error('[getShippingZones]', error)
    return data ?? []
  },
  ['shipping-zones'],
  { tags: [TAGS.SHIPPING] },
)
```

## Server Action — crear pedido con zona seleccionada

```typescript
// app/(public)/checkout/actions.ts
export const createOrder = async (formData: {
  payerEmail: string
  firstName: string
  lastName: string
  phone: string
  shippingZoneId: string
  cartItems: CartItem[]
  couponCode?: string
}) => {
  'use server'
  const supabase = createServiceClient()

  // Obtener zona de envío
  const { data: zone } = await supabase
    .from('shipping_zones')
    .select('name, price')
    .eq('id', formData.shippingZoneId)
    .single()

  if (!zone) throw new Error('Zona de envío no válida')

  // Calcular subtotal
  const subtotal = formData.cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  )

  // Aplicar cupón si existe
  let discountAmount = 0
  if (formData.couponCode) {
    const coupon = await validateCoupon(formData.couponCode, subtotal)
    if (coupon) discountAmount = coupon.discountAmount
  }

  const total = subtotal + zone.price - discountAmount

  // Insertar pedido
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      tenant_id: process.env.NEXT_PUBLIC_TENANT_ID!,
      payer_email: formData.payerEmail,
      customer_first_name: formData.firstName,
      customer_last_name: formData.lastName,
      customer_phone: formData.phone,
      shipping_carrier: zone.name,
      shipping_cost: zone.price,
      total,
      coupon_code: formData.couponCode ?? null,
      discount_amount: discountAmount,
    })
    .select()
    .single()

  if (error) throw error

  // Insertar items
  await supabase.from('order_items').insert(
    formData.cartItems.map(item => ({
      tenant_id: process.env.NEXT_PUBLIC_TENANT_ID!,
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId ?? null,
      name: item.name,
      variant_name: item.variantName ?? null,
      quantity: item.quantity,
      unit_price: item.price,
    }))
  )

  return order
}
```

## Componente UI — selector de zona

```tsx
// components/checkout/ShippingZoneSelector.tsx
'use client'
import type { ShippingZone } from '@/types/database'

interface Props {
  zones: ShippingZone[]
  selectedId: string
  onChange: (zoneId: string, price: number) => void
}

export const ShippingZoneSelector = ({ zones, selectedId, onChange }: Props) => {
  if (zones.length === 0) {
    return (
      <div className="shipping-fallback">
        <p>El costo de envío se coordina directamente por WhatsApp.</p>
      </div>
    )
  }

  return (
    <fieldset className="shipping-zones">
      <legend>Seleccioná tu zona de envío</legend>
      {zones.map(zone => (
        <label
          key={zone.id}
          className={`shipping-zone-option ${selectedId === zone.id ? 'selected' : ''}`}
        >
          <input
            type="radio"
            name="shippingZone"
            value={zone.id}
            checked={selectedId === zone.id}
            onChange={() => onChange(zone.id, zone.price)}
          />
          <span className="zone-name">{zone.name}</span>
          {zone.description && <span className="zone-desc">{zone.description}</span>}
          <span className="zone-price">${zone.price.toLocaleString('es-AR')}</span>
        </label>
      ))}
    </fieldset>
  )
}
```

## Zonas iniciales a crear en Módulo 0

```sql
INSERT INTO shipping_zones (tenant_id, name, description, price, position) VALUES
  ('TENANT_UUID', 'CABA', 'Ciudad Autónoma de Buenos Aires', 800, 1),
  ('TENANT_UUID', 'GBA', 'Gran Buenos Aires', 1200, 2),
  ('TENANT_UUID', 'Interior', 'Resto del país', 2000, 3);
```

> El cliente modifica estos precios desde el panel admin. Los valores son de referencia.

## Verificación ✅

- [ ] Zonas creadas en la tabla `shipping_zones`
- [ ] Selector de zona muestra zonas activas con precios
- [ ] El precio de la zona seleccionada se suma al total del pedido
- [ ] Fallback "coordinar por WhatsApp" funciona si no hay zonas activas
