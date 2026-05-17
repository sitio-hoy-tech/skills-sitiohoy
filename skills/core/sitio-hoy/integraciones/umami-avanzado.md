---
skill: umami-avanzado
descripcion: Umami Analytics con tracking de conversiones y eventos e-commerce (Plan Empresa)
tipo: integración — Plan Empresa (Módulo 7)
---

# Umami Analytics — Tracking Avanzado

Umami es privacy-first: sin cookies, sin banner GDPR.

Credenciales:
- `tenants.umami_url`: URL del script.
- `tenants.umami_website_id`: website id.
- Fallback permitido: `NEXT_PUBLIC_UMAMI_WEBSITE_ID` si el tenant todavía no tiene `umami_website_id`.

## Instalación en `app/layout.tsx`

```typescript
import Script from 'next/script'

// Obtener umami_url desde la tabla tenants
const config = await getTenantConfig(tenantId)

// En el JSX del layout:
{config.umami_url && (
  <Script
    src={config.umami_url}
    data-website-id={config.umami_website_id ?? process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
    strategy="afterInteractive"
    defer
  />
)}
```

```env
NEXT_PUBLIC_UMAMI_WEBSITE_ID=   # Del dashboard de Umami
```

## Helper de eventos

```typescript
// lib/analytics/umami.ts
type EventData = Record<string, string | number | boolean>

export const trackEvent = (name: string, data?: EventData) => {
  if (typeof window === 'undefined' || !window.umami) return
  window.umami.track(name, data)
}

export const Analytics = {
  productViewed:    (slug: string, name: string) =>
    trackEvent('product_viewed', { slug, name }),

  addedToCart:      (productId: string, name: string, price: number) =>
    trackEvent('add_to_cart', { product_id: productId, name, price }),

  checkoutStarted:  (total: number, itemCount: number) =>
    trackEvent('checkout_started', { total, items: itemCount }),

  purchase:         (orderId: string, total: number, method: string) =>
    trackEvent('purchase', { order_id: orderId, total, method }),

  couponApplied:    (code: string, discount: number) =>
    trackEvent('coupon_applied', { code, discount }),
}
```

## Tipos globales

```typescript
// types/umami.d.ts
interface Window {
  umami?: {
    track: (name: string, data?: Record<string, string | number | boolean>) => void
    identify: (data: Record<string, string>) => void
  }
}
```

## Puntos de tracking en el sitio

| Evento | Dónde agregar |
|---|---|
| `product_viewed` | `app/(public)/catalogo/[slug]/page.tsx` — useEffect |
| `add_to_cart` | `components/catalog/AddToCartButton.tsx` — onClick |
| `checkout_started` | Al abrir el checkout — primer paso |
| `purchase` | En el callback `onSuccess` del PaymentBrick |
| `coupon_applied` | En el Server Action que valida el cupón |

## Verificación ✅

- [ ] Script Umami cargando en el sitio (verificar en Network tab)
- [ ] Evento `product_viewed` registrado al visitar un producto
- [ ] Evento `add_to_cart` registrado al agregar al carrito
- [ ] Evento `purchase` registrado al completar una compra de prueba
- [ ] Dashboard de Umami muestra las métricas en tiempo real
