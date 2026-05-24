---
skill: whatsapp
descripcion: WhatsApp como CTA — botón flotante, links por producto y mensajes pre-armados
tipo: integración — todos los planes (Plan Esencial: CTA principal / Emprendimiento+Empresa: soporte secundario)
---

# WhatsApp Integration

WhatsApp no requiere API ni paquetes. Es un link `https://wa.me/` con mensaje pre-armado.

---

## Formato del número argentino

```
Internacional: +54 9 11 XXXX-XXXX
wa.me format:  5491XXXXXXXX   (sin +, sin espacios, con 9 intercalado)

Ejemplos:
  011 1234-5678  →  5491112345678
  011 5678-1234  →  5491156781234
  Córdoba 351 XXX-XXXX  →  543513XXXXXX  (351 → 543513 con el 9)
```

> ⚠️ Sin el `9` intermedio el mensaje llega pero no abre chat directo en móvil.

---

## Número de WhatsApp — desde `tenants`, no `.env`

El número de WhatsApp se lee de `tenants.whatsapp` (columna `text`), nunca de
`NEXT_PUBLIC_WA_NUMBER` ni hardcodeado en componentes.

En `app/layout.tsx` o `app/page.tsx` (Server Components), leer con `getTenantConfig()`
y pasar como prop a todos los componentes que lo necesiten:

```tsx
// app/layout.tsx
const tenant = await getTenantConfig()
// ...
<WhatsAppButton waNumber={tenant.whatsapp ?? ''} />
<Footer waNumber={tenant.whatsapp ?? ''} />
```

```tsx
// app/page.tsx
const tenant = await getTenantConfig()
// ...
<Hero waNumber={tenant.whatsapp ?? ''} businessName={tenant.name} />
<FaqInline waNumber={tenant.whatsapp ?? ''} />
```

**Nunca hardcodear el número en componentes.** Siempre recibirlo como prop.

## Helper

```typescript
// lib/whatsapp.ts

/**
 * Genera URL de WhatsApp con mensaje pre-armado.
 * El número viene como parámetro, leído de tenants.whatsapp.
 */
export const waUrl = (waNumber: string, message: string): string =>
  `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`

/**
 * Mensajes pre-armados por contexto
 */
export const WA_MESSAGES = {
  /** Plan Esencial — consulta de producto específico */
  product: (name: string, price: number) =>
    `Hola! Me interesa el producto *${name}* ($${price.toLocaleString('es-AR')}). ¿Está disponible?`,

  /** Plan Esencial — consulta general */
  catalog: () =>
    `Hola! Estoy viendo el catálogo y me gustaría recibir más información.`,

  /** Todos los planes — soporte en checkout */
  support: () =>
    `Hola! Necesito ayuda con mi compra.`,

  /** Todos los planes — seguimiento de pedido */
  order: (orderId: string) =>
    `Hola! Quiero consultar sobre mi pedido #${orderId.slice(0, 8).toUpperCase()}.`,

  /** Plan Esencial — CTA hero */
  hero: (businessName: string) =>
    `Hola *${businessName}*! Vi tu sitio y me gustaría consultar.`,
}
```

---

## Botón flotante (todos los planes)

```tsx
// components/ui/WhatsAppButton.tsx
import Link from 'next/link'
import { waUrl, WA_MESSAGES } from '@/lib/whatsapp'

interface Props {
  waNumber: string  // Viene de tenants.whatsapp via props
}

export const WhatsAppButton = ({ waNumber }: Props) => {
  if (!waNumber) return null  // Si no hay número configurado, no mostrar

  return (
  <Link
    href={waUrl(waNumber, WA_MESSAGES.support())}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Contactar por WhatsApp"
    className="whatsapp-float"
  >
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.862L.057 23.428a.75.75 0 0 0 .916.916l5.566-1.476A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.717 9.717 0 0 1-4.964-1.358l-.356-.213-3.696.979.979-3.696-.213-.356A9.717 9.717 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
  </Link>
  )
}
```

```css
/* styles/components/whatsapp.css */
.whatsapp-float {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  background-color: #25d366;
  color: white;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.whatsapp-float:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 16px rgba(37, 211, 102, 0.5);
}

/* En mobile: alejar del borde inferior del viewport para no tapar el nav */
@media (max-width: 768px) {
  .whatsapp-float {
    bottom: 5rem;
  }
}
```

Agregar `<WhatsAppButton />` en `app/layout.tsx` fuera del `<main>`.

---

## CTA por producto (Plan Esencial)

```tsx
// components/catalog/WhatsAppProductCTA.tsx
'use client'
import Link from 'next/link'
import { waUrl, WA_MESSAGES } from '@/lib/whatsapp'

interface Props {
  waNumber: string   // Viene de tenants.whatsapp via props
  productName: string
  price: number
}

export const WhatsAppProductCTA = ({ waNumber, productName, price }: Props) => (
  <Link
    href={waUrl(waNumber, WA_MESSAGES.product(productName, price))}
    target="_blank"
    rel="noopener noreferrer"
    className="btn-whatsapp-product"
  >
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.862L.057 23.428a.75.75 0 0 0 .916.916l5.566-1.476A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.717 9.717 0 0 1-4.964-1.358l-.356-.213-3.696.979.979-3.696-.213-.356A9.717 9.717 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
    Consultar por WhatsApp
  </Link>
)
```

---

## Plan Esencial — CTA hero

```tsx
// En app/(public)/page.tsx — hero section
import { waUrl, WA_MESSAGES } from '@/lib/whatsapp'
import { getTenantConfig } from '@/lib/supabase/tenant'

// Server Component — leer número del tenant
const tenant = await getTenantConfig()
const heroWaUrl = tenant.whatsapp
  ? waUrl(tenant.whatsapp, WA_MESSAGES.hero(tenant.name))
  : '#'

// En JSX:
<a href={heroWaUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
  Consultar por WhatsApp
</a>
```

---

## Verificación ✅

- [ ] `tenants.whatsapp` configurado con el número correcto (formato `5491...`)
- [ ] Número de WhatsApp NO está hardcodeado en ningún componente — siempre llega como prop
- [ ] Número de WhatsApp NO está en `.env` — siempre se lee de `tenants`
- [ ] Botón flotante visible en mobile sin tapar navegación inferior
- [ ] Si `tenants.whatsapp` está vacío, el botón flotante no se renderiza
- [ ] Link de producto abre WhatsApp con mensaje pre-armado correcto
- [ ] `encodeURIComponent` aplicado — el mensaje no se rompe con caracteres especiales
- [ ] Botón tiene `aria-label` para accesibilidad
- [ ] En Plan Esencial: botón WhatsApp es el CTA principal en hero, catálogo y producto
