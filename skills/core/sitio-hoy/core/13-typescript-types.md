---
skill: typescript-types
descripcion: Interfaces TypeScript del schema — usar SIEMPRE en lugar de inventar tipos
tipo: core — copiar a types/database.ts en Módulo 0, nunca modificar manualmente
---

# TypeScript Types — Schema de BD

> Estos tipos derivan exactamente del schema confirmado en `05-base-datos.md`.
> Copiar el bloque completo a `types/database.ts` en Módulo 0.
> **Nunca inventar tipos inline** — si algo no encaja, revisar el schema primero.

---

## `types/database.ts`

```typescript
// ─── TENANTS ────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: 'esencial' | 'emprendimiento' | 'empresa' | null
  status: 'active' | 'suspended' | 'cancelled' | null
  max_products: number | null
  url: string | null
  revalidation_secret: string | null
  mp_access_token: string | null
  mp_public_key: string | null
  resend_api_key: string | null
  contact_email: string | null
  envia_access_token: string | null
  correo_argentino_customer_id: string | null
  umami_url: string | null
  umami_website_id: string | null
  origin_name: string | null
  origin_phone: string | null
  origin_address: string | null
  origin_city: string | null
  origin_state: string | null
  origin_postal_code: string | null
  subscription_id: string | null
  subscription_status: string | null
  current_period_end: string | null
  created_at: string
}

// ─── CATEGORIES ─────────────────────────────────────────────────────────────

export interface Category {
  id: string
  tenant_id: string
  name: string
  slug: string
  position: number
  active: boolean
}

// Category no tiene campo image en BD.
// Para imágenes de categorías, resolver por slug con un mapa local de Unsplash.

export interface Subcategory {
  id: string
  tenant_id: string
  category_id: string
  name: string
  slug: string
  active: boolean
  position: number
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  tenant_id: string
  name: string
  slug: string | null
  description: string | null
  price: number
  compare_at_price: number | null    // ← precio tachado. NO usar compare_price
  stock: number
  stock_unlimited: boolean
  weight_grams: number | null
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  shipping_required: boolean | null
  category_id: string | null
  active: boolean
  featured: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface ProductImage {
  id: string
  tenant_id: string
  product_id: string | null
  url: string
  alt: string | null
  position: number
}

export interface ProductVariant {
  id: string
  tenant_id: string
  product_id: string | null
  name: string
  sku: string | null
  stock: number
  price: number | null            // precio absoluto — si tiene valor, usar este
  price_modifier: number          // se suma al producto.price si price es null
}

// Producto con relaciones (para página de detalle y catálogo)
export interface ProductWithRelations extends Product {
  product_images: ProductImage[]
  product_variants: ProductVariant[]
  categories: Pick<Category, 'name' | 'slug'> | null
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'pending_payment'
  | 'paid'
  | 'payment_failed'
  | 'processing'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'in_process'

export interface Order {
  id: string
  tenant_id: string | null
  status: OrderStatus | null
  payment_status: PaymentStatus | null
  mp_payment_id: string | null        // ← NO usar payment_id
  payment_provider: string | null
  external_reference: string | null
  total: number | null                // ← NO usar total_amount
  currency: string
  payer_email: string | null          // ← NO usar customer_email
  customer_first_name: string | null
  customer_last_name: string | null
  customer_phone: string | null
  shipping_address: ShippingAddress | null
  shipping_carrier: string | null
  shipping_service: string | null
  shipping_cost: number
  shipping_label_url: string | null
  shipping_tracking_number: string | null
  shipping_postal_code: string | null
  tracking_token: string
  notes: string | null
  coupon_code: string | null
  discount_amount: number
  created_at: string
  updated_at: string
}

export interface ShippingAddress {
  street: string
  number: string
  floor?: string
  apartment?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface OrderItem {
  id: string
  tenant_id: string
  order_id: string | null
  product_id: string | null
  variant_id: string | null
  name: string
  variant_name: string | null
  quantity: number
  unit_price: number
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

// ─── COUPONS ─────────────────────────────────────────────────────────────────

export interface Coupon {
  id: string
  tenant_id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_amount: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  starts_at: string | null
  active: boolean
}

// ─── SHIPPING ZONES (Plan Emprendimiento) ────────────────────────────────────

export interface ShippingZone {
  id: string
  tenant_id: string
  name: string
  description: string | null
  price: number
  position: number
  active: boolean
}

// ─── CONTACT MESSAGES ───────────────────────────────────────────────────────

export interface ContactMessage {
  id: string
  tenant_id: string
  name: string
  email: string
  phone: string | null
  message: string
  source: string | null
  status: 'new' | 'read' | 'archived' | null
  created_at: string
}

// ─── EVENTS / AUDIT ─────────────────────────────────────────────────────────

export interface OrderEvent {
  id: string
  tenant_id: string
  order_id: string | null
  type: string
  payload: Record<string, unknown>
  created_at: string
}

export interface PaymentEvent {
  id: string
  tenant_id: string
  order_id: string | null
  provider: 'mercadopago' | string
  provider_event_id: string | null
  status: string | null
  payload: Record<string, unknown>
  created_at: string
}

// ─── PLATFORM CONFIG ───────────────────────────────────────────────────────

export interface PlatformConfig {
  id: string
  correo_argentino_user: string | null
  correo_argentino_password: string | null
  correo_argentino_customer_id: string | null
  correo_argentino_token: string | null
  correo_argentino_token_expires_at: string | null
  created_at: string
  updated_at: string
}

// ─── USER TENANTS ────────────────────────────────────────────────────────────

export interface UserTenant {
  id: string
  user_id: string | null
  tenant_id: string | null
  role: 'owner' | 'admin' | 'editor'
  created_at: string
}

// ─── BLOG ───────────────────────────────────────────────────────────────────

export interface BlogCategory {
  id: string
  tenant_id: string
  name: string
  slug: string
  description: string | null
  position: number
  active: boolean
  created_at: string
  updated_at: string
}

export type BlogPostStatus = 'draft' | 'published' | 'archived'

export interface BlogPost {
  id: string
  tenant_id: string
  blog_category_id: string | null
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  cover_image: string | null
  cover_image_alt: string | null
  author: string | null
  status: BlogPostStatus
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
  featured: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface BlogPostWithCategory extends BlogPost {
  blog_categories: Pick<BlogCategory, 'name' | 'slug'> | null
}

// ─── CART (estado local — no persiste en BD) ─────────────────────────────────

export interface CartItem {
  productId: string
  variantId: string | null
  name: string
  variantName: string | null
  price: number
  quantity: number
  imageUrl: string | null
  slug: string
}

export interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variantId: string | null) => void
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}
```

---

## Regla TypeScript — unions siempre con `type`

Para unions discriminadas, usar `type`. `interface` no puede representar una union y rompe el parser.

```typescript
// ❌ Incorrecto
export interface ContactResult { ok: true; data: string } | { ok: false; error: string }

// ✅ Correcto
export type ContactResult =
  | { ok: true; data: string }
  | { ok: false; error: string }
```

---

## Helpers de precio de variante

```typescript
// lib/utils/price.ts

/**
 * Calcula el precio final de un producto considerando la variante seleccionada.
 * - Si la variante tiene price absoluto → usar ese precio
 * - Si tiene price_modifier → sumar al precio base del producto
 */
export const getVariantPrice = (
  basePrice: number,
  variant: Pick<ProductVariant, 'price' | 'price_modifier'> | null,
): number => {
  if (!variant) return basePrice
  if (variant.price !== null) return variant.price
  return basePrice + variant.price_modifier
}

export const formatPrice = (amount: number): string =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
```

---

## Uso correcto en queries

```typescript
// ✅ Correcto — tipo inferido coincide con BD
const { data } = await supabase
  .from('products')
  .select('id, name, price, compare_at_price, stock, stock_unlimited')
  .returns<Pick<Product, 'id' | 'name' | 'price' | 'compare_at_price' | 'stock' | 'stock_unlimited'>[]>()

// ✅ Con relaciones
const { data } = await supabase
  .from('products')
  .select(`
    id, name, slug, price, compare_at_price, stock, stock_unlimited, description,
    product_images!product_images_product_id_fkey(url, alt, position),
    categories(name, slug)
  `)
  .returns<ProductWithRelations[]>()

// ❌ Incorrecto — tipo inventado que no existe en la BD
const product: { customer_email: string; total_amount: number } = ...
```

---

## Checklist ✅

- [ ] `types/database.ts` creado en Módulo 0
- [ ] Todos los componentes y Server Actions importan tipos desde `@/types/database`
- [ ] No hay tipos inline que dupliquen estas interfaces
- [ ] `getVariantPrice()` y `formatPrice()` en `lib/utils/price.ts`
