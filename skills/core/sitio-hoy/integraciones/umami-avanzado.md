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
  // Catálogo y productos
  productViewed:    (slug: string, name: string, price: number) =>
    trackEvent('product_viewed', { slug, name, price }),

  categoryViewed:   (slug: string, name: string) =>
    trackEvent('category_viewed', { slug, name }),

  searchPerformed:  (query: string, resultCount: number) =>
    trackEvent('search_performed', { query, results: resultCount }),

  filterApplied:    (filterType: string, value: string) =>
    trackEvent('filter_applied', { type: filterType, value }),

  // Carrito
  addedToCart:      (productId: string, name: string, price: number, quantity: number) =>
    trackEvent('add_to_cart', { product_id: productId, name, price, quantity }),

  removedFromCart:  (productId: string, name: string) =>
    trackEvent('remove_from_cart', { product_id: productId, name }),

  cartViewed:       (total: number, itemCount: number) =>
    trackEvent('cart_viewed', { total, items: itemCount }),

  // Checkout
  checkoutStarted:  (total: number, itemCount: number) =>
    trackEvent('checkout_started', { total, items: itemCount }),

  shippingSelected: (method: string, cost: number) =>
    trackEvent('shipping_selected', { method, cost }),

  purchase:         (orderId: string, total: number, method: string) =>
    trackEvent('purchase', { order_id: orderId, total, method }),

  couponApplied:    (code: string, discount: number) =>
    trackEvent('coupon_applied', { code, discount }),

  // Interacción general
  ctaClicked:       (location: string, label: string) =>
    trackEvent('cta_clicked', { location, label }),

  whatsappClicked:  (location: string, productSlug?: string) =>
    trackEvent('whatsapp_clicked', { location, ...(productSlug ? { product: productSlug } : {}) }),

  contactFormSubmitted: () =>
    trackEvent('contact_form_submitted'),

  // Navegación
  pageScrolled:     (page: string, percentage: number) =>
    trackEvent('page_scrolled', { page, percentage }),

  socialClicked:    (network: string) =>
    trackEvent('social_clicked', { network }),
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

**Regla: trackear todo lo máximo posible.** Cada interacción del usuario debe quedar registrada para análisis.

| Evento | Dónde agregar |
|---|---|
| `product_viewed` | `app/(public)/catalogo/[slug]/page.tsx` — useEffect al montar |
| `category_viewed` | `app/(public)/catalogo/page.tsx` — al filtrar por categoría |
| `search_performed` | Componente de búsqueda — al ejecutar búsqueda |
| `filter_applied` | Componente de filtros — al cambiar filtro |
| `add_to_cart` | `components/catalog/AddToCartButton.tsx` — onClick |
| `remove_from_cart` | `components/checkout/CartItem.tsx` — al eliminar |
| `cart_viewed` | Al abrir el drawer/sidebar del carrito |
| `checkout_started` | Al abrir el checkout — primer paso |
| `shipping_selected` | Al elegir zona/método de envío |
| `purchase` | En el callback `onSuccess` del PaymentBrick |
| `coupon_applied` | En el Server Action que valida el cupón |
| `cta_clicked` | En botones principales (hero CTA, "Ver catálogo", etc.) |
| `whatsapp_clicked` | En todos los botones de WhatsApp (flotante, producto, hero) |
| `contact_form_submitted` | Al enviar formulario de contacto |
| `social_clicked` | En links de redes sociales del footer |
| `page_scrolled` | En páginas importantes (home) — al 25%, 50%, 75%, 100% |

## Verificación ✅

- [ ] Script Umami cargando en el sitio (verificar en Network tab)
- [ ] Evento `product_viewed` registrado al visitar un producto
- [ ] Evento `category_viewed` registrado al filtrar
- [ ] Evento `add_to_cart` registrado al agregar al carrito
- [ ] Evento `checkout_started` registrado
- [ ] Evento `purchase` registrado al completar una compra de prueba
- [ ] Evento `whatsapp_clicked` registrado
- [ ] Evento `contact_form_submitted` registrado
- [ ] Dashboard de Umami muestra las métricas en tiempo real
