---
skill: base-datos
descripcion: Schema completo de Supabase — ÚNICA fuente de verdad. Leer SIEMPRE antes de escribir queries.
tipo: core — consultar antes de cualquier query, mutación o migración
---

# Base de Datos — Fuente Única de Verdad

> **CRÍTICO**: Este archivo define los nombres exactos de columnas. Cualquier otro archivo que contradiga esto está desactualizado. Siempre usar los nombres de columna de esta tabla.

---

## Configuración del MCP de Supabase

### Con MCP activo (Claude Code / Cursor / Windsurf)

Agregar en `.claude/settings.json` del proyecto:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y", "@supabase/mcp-server-supabase",
        "--supabase-url", "https://TU_PROJECT_REF.supabase.co",
        "--supabase-key", "TU_SERVICE_ROLE_KEY"
      ]
    }
  }
}
```

### Sin MCP (cualquier IA)

Generar los archivos SQL en `supabase/migrations/`, vincular el proyecto con `supabase link`
y aplicar con `supabase db push`. No usar SQL Editor salvo bloqueo documentado.

---

## Orden de creación de tablas (Módulo 0)

```
1. tenants
2. user_tenants
3. categories
4. subcategories
5. products
6. product_images
7. product_variants
8. orders
9. order_items
10. coupons
11. shipping_zones  ← existe siempre; Emprendimiento la usa, Empresa la conserva como fallback
12. contact_messages
13. order_events
14. payment_events
15. platform_config
16. blog_categories
17. blog_posts
```

> **Schema version: 2.2** — Incluye blog_posts/blog_categories. Los proyectos existentes pueden actualizarse con migraciones diferenciales.
> Regla SitioHoy v2.2: el schema base se crea completo en todos los planes.
> Las funcionalidades se activan o desactivan por configuración del tenant, no borrando tablas.
> Para generar la migración canónica, preferir `sitio-hoy-database`.

---

## Tabla: `tenants`

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK del tenant |
| `name` | text | NO | — | Nombre del negocio |
| `slug` | text | NO | — | Identificador único |
| `plan` | text | YES | `'esencial'` | esencial / emprendimiento / empresa |
| `status` | text | YES | `'active'` | active / suspended / cancelled |
| `max_products` | integer | YES | 50 | Límite según plan |
| `url` | text | YES | — | URL del sitio |
| `revalidation_secret` | text | YES | — | Secret único por tenant para `/api/revalidate` |
| `mp_access_token` | text | YES | — | MercadoPago Access Token |
| `mp_public_key` | text | YES | — | MercadoPago Public Key |
| `resend_api_key` | text | YES | — | API key de Resend |
| `contact_email` | text | YES | — | Email destino del negocio para formularios de contacto |
| `envia_access_token` | text | YES | — | Token Envia.com |
| `correo_argentino_customer_id` | text | YES | — | Customer ID MiCorreo específico del negocio; se carga desde admin |
| `umami_url` | text | YES | — | URL script Umami |
| `umami_website_id` | text | YES | — | Website ID de Umami |
| `origin_name` | text | YES | — | Remitente envíos (Envia.com) |
| `origin_phone` | text | YES | — | Teléfono remitente |
| `origin_address` | text | YES | — | Dirección de origen |
| `origin_city` | text | YES | — | Ciudad de origen |
| `origin_state` | text | YES | — | Código provincia ISO |
| `origin_postal_code` | text | YES | — | CP de origen |
| `subscription_id` | text | YES | — | ID suscripción MP |
| `subscription_status` | text | YES | — | Estado suscripción |
| `current_period_end` | timestamptz | YES | — | Fin del período activo |
| `created_at` | timestamptz | YES | now() | — |

Migración incremental si el proyecto ya existe:

```sql
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS revalidation_secret text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_email text;

UPDATE public.tenants
SET
  url = 'https://DOMINIO-DEL-SITIO.vercel.app',
  revalidation_secret = 'SECRET-UNICO-POR-TENANT'
WHERE id = 'TENANT_ID';
```

Generar el secret con `openssl rand -hex 32`. Debe ser distinto por tenant.

---

## Tabla: `user_tenants`

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | YES | — (FK → auth.users.id) |
| `tenant_id` | uuid | YES | — (FK → tenants.id) |
| `role` | text | YES | `'admin'` |
| `created_at` | timestamptz | YES | now() |

---

## Tabla: `categories`

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `name` | text | NO | — |
| `slug` | text | NO | — |
| `position` | integer | YES | 0 |
| `active` | boolean | YES | true |

---

## Tabla: `subcategories`

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `category_id` | uuid | NO | — (FK → categories.id) |
| `name` | text | NO | — |
| `slug` | text | NO | — |
| `active` | boolean | YES | true |
| `position` | integer | YES | 0 |

---

## Tabla: `products`

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `name` | text | NO | — |
| `slug` | text | YES | — |
| `description` | text | YES | — |
| `price` | numeric | NO | — |
| `compare_at_price` | numeric | YES | — | ← precio tachado. NO usar `compare_price` |
| `stock` | integer | YES | 0 | Stock base si el producto no usa variantes |
| `stock_unlimited` | boolean | YES | false | `true` para servicios/productos sin control de stock |
| `weight_grams` | integer | YES | 500 | Peso del producto para envíos. Gramos, mínimo 1 |
| `length_cm` | numeric | YES | 20 | Largo del paquete en cm |
| `width_cm` | numeric | YES | 15 | Ancho del paquete en cm |
| `height_cm` | numeric | YES | 8 | Alto del paquete en cm |
| `shipping_required` | boolean | YES | true | `false` para digital/servicio |
| `category_id` | uuid | YES | — (FK → categories.id) |
| `active` | boolean | YES | true |
| `featured` | boolean | YES | false |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `created_by` | uuid | YES | — |
| `updated_by` | uuid | YES | — |

---

## Tabla: `product_images`

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `product_id` | uuid | YES | — (FK → products.id) |
| `url` | text | NO | — |
| `alt` | text | YES | — |
| `position` | integer | YES | 0 |

---

## Tabla: `product_variants`

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `product_id` | uuid | YES | — (FK → products.id) |
| `name` | text | NO | — |
| `sku` | text | YES | — |
| `stock` | integer | YES | 0 |
| `price` | numeric | YES | — | ← precio absoluto override |
| `price_modifier` | numeric | YES | 0 | ← se suma al precio del producto |

> Precio final de variante: si `price` tiene valor → usar `price`. Si no → `products.price + price_modifier`.

---

## Tabla: `orders`

> ⚠️ Nombres exactos de columnas — errores comunes marcados

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | YES | — |
| `status` | text | YES | `'pending'` | Ver constraint completo abajo |
| `payment_status` | text | YES | `'pending'` | pending / approved / rejected / in_process |
| `mp_payment_id` | text | YES | — | ← NO usar `payment_id` |
| `payment_provider` | text | YES | `'mercadopago'` | — |
| `external_reference` | text | YES | — | ID externo MP |
| `total` | numeric | YES | — | ← NO usar `total_amount` |
| `currency` | text | YES | `'ARS'` | — |
| `payer_email` | text | YES | — | ← NO usar `customer_email` |
| `customer_first_name` | text | YES | — |
| `customer_last_name` | text | YES | — |
| `customer_phone` | text | YES | — |
| `shipping_address` | jsonb | YES | — |
| `shipping_carrier` | text | YES | — |
| `shipping_service` | text | YES | — |
| `shipping_cost` | numeric | YES | 0 |
| `shipping_label_url` | text | YES | — |
| `shipping_tracking_number` | text | YES | — |
| `shipping_postal_code` | text | YES | — |
| `tracking_token` | text | YES | gen_random_uuid()::text |
| `notes` | text | YES | — |
| `coupon_code` | text | YES | — |
| `discount_amount` | numeric | YES | 0 |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

Migración incremental si el proyecto ya existe:

```sql
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending', 'pending_payment', 'paid', 'payment_failed',
      'processing', 'confirmed', 'shipped', 'delivered',
      'cancelled', 'refunded'
    )
  );
```

---

## Tabla: `order_items`

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `order_id` | uuid | YES | — (FK → orders.id) |
| `product_id` | uuid | YES | — (FK → products.id) |
| `variant_id` | uuid | YES | — (FK → product_variants.id) |
| `name` | text | NO | — |
| `variant_name` | text | YES | — |
| `quantity` | integer | NO | — |
| `unit_price` | numeric | NO | — |

---

## Tabla: `coupons`

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `code` | text | NO | — |
| `type` | text | NO | — | `'percent'` o `'fixed'` |
| `value` | numeric | NO | — |
| `min_amount` | numeric | YES | 0 |
| `max_uses` | integer | YES | — |
| `uses_count` | integer | YES | 0 |
| `expires_at` | timestamptz | YES | — |
| `starts_at` | timestamptz | YES | — |
| `active` | boolean | YES | true |

---

## Tabla: `shipping_zones`

> Usada por Plan Emprendimiento. En Plan Empresa queda disponible como fallback si Envia.com no está configurado.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `name` | text | NO | — | ej: "CABA", "GBA", "Interior" |
| `description` | text | YES | — | ej: "Ciudad de Buenos Aires" |
| `price` | numeric | NO | — | costo del envío |
| `position` | integer | YES | 0 |
| `active` | boolean | YES | true |

---

## Tabla: `contact_messages`

> Guarda leads del formulario. Nunca perder mensajes si Resend no está configurado.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `name` | text | NO | — |
| `email` | text | NO | — |
| `phone` | text | YES | — |
| `message` | text | NO | — |
| `source` | text | YES | `'contact_form'` |
| `status` | text | YES | `'new'` |
| `created_at` | timestamptz | YES | now() |

---

## Tabla: `order_events`

> Auditoría de cambios de estado de pedidos y eventos internos.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `order_id` | uuid | YES | — (FK → orders.id) |
| `type` | text | NO | — |
| `payload` | jsonb | YES | `'{}'::jsonb` |
| `created_at` | timestamptz | YES | now() |

---

## Tabla: `payment_events`

> Auditoría de webhooks y respuestas de MercadoPago. Guardar payload antes de mutar `orders`.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `tenant_id` | uuid | NO | — |
| `order_id` | uuid | YES | — (FK → orders.id) |
| `provider` | text | NO | `'mercadopago'` |
| `provider_event_id` | text | YES | — |
| `status` | text | YES | — |
| `payload` | jsonb | YES | `'{}'::jsonb` |
| `created_at` | timestamptz | YES | now() |

---

## Tabla: `platform_config`

> Configuración privada de la plataforma SitioHoy. No es por tenant.
> Las credenciales de acceso de Correo Argentino viven acá, no en `tenants` ni `.env`.
> `tenants.correo_argentino_customer_id` sigue siendo específico de cada negocio.

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `correo_argentino_user` | text | YES | — |
| `correo_argentino_password` | text | YES | — |
| `correo_argentino_customer_id` | text | YES | — |
| `correo_argentino_token` | text | YES | — |
| `correo_argentino_token_expires_at` | timestamptz | YES | — |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

---

## Tabla: `blog_categories`

Categorías de blog para organizar artículos. Se crean solo si el cliente solicita blog.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `tenant_id` | uuid | NO | — | FK → tenants.id |
| `name` | text | NO | — | Nombre de la categoría |
| `slug` | text | NO | — | URL-friendly |
| `description` | text | YES | — | Descripción de la categoría |
| `position` | integer | YES | 0 | Orden de aparición |
| `active` | boolean | YES | true | Visible/oculta |
| `created_at` | timestamptz | YES | now() | — |
| `updated_at` | timestamptz | YES | now() | — |

Unique: `(tenant_id, slug)`.

---

## Tabla: `blog_posts`

Artículos de blog. Se crean solo si el cliente solicita blog. Soporta SEO completo con metadata, OG image y Schema.org Article.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `tenant_id` | uuid | NO | — | FK → tenants.id |
| `blog_category_id` | uuid | YES | — | FK → blog_categories.id |
| `title` | text | NO | — | Título del artículo |
| `slug` | text | NO | — | URL-friendly |
| `excerpt` | text | YES | — | Resumen corto (≤160 chars para meta description) |
| `content` | text | YES | — | Contenido completo (Markdown o HTML) |
| `cover_image` | text | YES | — | URL de la imagen de portada |
| `cover_image_alt` | text | YES | — | Alt text para SEO |
| `author` | text | YES | — | Nombre del autor |
| `status` | text | YES | 'draft' | draft, published, archived |
| `published_at` | timestamptz | YES | — | Fecha de publicación (null = draft) |
| `seo_title` | text | YES | — | Meta title (si difiere del título) |
| `seo_description` | text | YES | — | Meta description (si difiere del excerpt) |
| `featured` | boolean | YES | false | Destacado en home/listado |
| `position` | integer | YES | 0 | Orden manual |
| `created_at` | timestamptz | YES | now() | — |
| `updated_at` | timestamptz | YES | now() | — |

Unique: `(tenant_id, slug)`.

---

## Relaciones

```
tenants (1) ──── (N) products
tenants (1) ──── (N) categories
tenants (1) ──── (N) orders
tenants (1) ──── (N) coupons
tenants (1) ──── (N) shipping_zones
tenants (1) ──── (N) contact_messages
tenants (1) ──── (N) order_events
tenants (1) ──── (N) payment_events
tenants (N) ──── (N) auth.users  [via user_tenants]

products (1) ──── (N) product_images
products (1) ──── (N) product_variants
products (N) ──── (1) categories
categories (1) ── (N) subcategories

orders (1) ───── (N) order_items
orders (1) ───── (N) order_events
orders (1) ───── (N) payment_events
order_items (N) ─ (1) products
order_items (N) ─ (1) product_variants

blog_categories (1) ─ (N) blog_posts
tenants (1) ──── (N) blog_categories
tenants (1) ──── (N) blog_posts
```

---

## Queries de referencia

```typescript
// ⚠️ Siempre usar hints explícitos de FK — PostgREST lanza PGRST201 sin ellos
const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!

// Productos activos con imágenes y categorías
const { data: products } = await supabase
  .from('products')
  .select(`
    id, name, slug, price, compare_at_price, stock, stock_unlimited, weight_grams, length_cm, width_cm, height_cm, shipping_required, featured, description,
    product_images!product_images_product_id_fkey(url, alt, position),
    categories(name, slug)
  `)
  .eq('tenant_id', tenantId)
  .eq('active', true)
  .order('created_at', { ascending: false })

// Producto individual para página de detalle
const { data: product } = await supabase
  .from('products')
  .select(`
    id, name, slug, price, compare_at_price, stock, stock_unlimited, weight_grams, length_cm, width_cm, height_cm, shipping_required, description,
    product_images!product_images_product_id_fkey(url, alt, position),
    product_variants!product_variants_product_id_fkey(id, name, stock, price, price_modifier),
    categories(name, slug)
  `)
  .eq('tenant_id', tenantId)
  .eq('slug', slug)
  .single()

// Pedidos con items
const { data: orders } = await supabase
  .from('orders')
  .select(`
    id, status, payment_status, total, payer_email, created_at,
    order_items(name, variant_name, quantity, unit_price)
  `)
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false })
```

---

## Errores conocidos y soluciones

| Error | Causa | Fix |
|---|---|---|
| `PGRST201` | FK ambigua en product_images o product_variants | Usar `product_images!product_images_product_id_fkey(...)` |
| `PGRST204` | Columna inexistente en orders | Verificar nombres exactos arriba: `payer_email`, `total`, `mp_payment_id` |
| Admin pages renderizan vacías | Falta `export const dynamic = "force-dynamic"` | Agregar al inicio de cada page bajo `/admin/**` |
| Checkbox no guarda en Server Action | `formData.get()` retorna el hidden "false" | Usar `formData.getAll(name).includes("true")` |

---

## SQL de migración inicial completa

```sql
-- 1. Función helper tenant_id (en public — Supabase no permite crear en schema auth)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
$$;

-- 2. Tenants
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan text DEFAULT 'esencial',
  status text DEFAULT 'active',
  max_products integer DEFAULT 50,
  url text,
  revalidation_secret text,
  mp_access_token text,
  mp_public_key text,
  resend_api_key text,
  contact_email text,
  envia_access_token text,
  correo_argentino_customer_id text,
  umami_url text,
  umami_website_id text,
  origin_name text, origin_phone text, origin_address text,
  origin_city text, origin_state text, origin_postal_code text,
  subscription_id text, subscription_status text, current_period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 3. User-tenants
CREATE TABLE user_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

-- 4. Categories
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  position integer DEFAULT 0,
  active boolean DEFAULT true,
  UNIQUE (tenant_id, slug)
);

-- 5. Subcategories
CREATE TABLE subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  active boolean DEFAULT true,
  position integer DEFAULT 0,
  UNIQUE (tenant_id, slug)
);

-- 6. Products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  description text,
  price numeric(10,2) NOT NULL,
  compare_at_price numeric(10,2),
  stock integer DEFAULT 0 CHECK (stock >= 0),
  stock_unlimited boolean DEFAULT false,
  weight_grams integer DEFAULT 500 CHECK (weight_grams IS NULL OR weight_grams > 0),
  length_cm numeric(10,2) DEFAULT 20 CHECK (length_cm IS NULL OR length_cm > 0),
  width_cm numeric(10,2) DEFAULT 15 CHECK (width_cm IS NULL OR width_cm > 0),
  height_cm numeric(10,2) DEFAULT 8 CHECK (height_cm IS NULL OR height_cm > 0),
  shipping_required boolean DEFAULT true,
  category_id uuid REFERENCES categories(id),
  active boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, slug)
);

-- 7. Product images
CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  position integer DEFAULT 0
);

-- 8. Product variants
CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  stock integer DEFAULT 0,
  price numeric(10,2),
  price_modifier numeric(10,2) DEFAULT 0
);

-- 9. Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending', 'pending_payment', 'paid', 'payment_failed',
      'processing', 'confirmed', 'shipped', 'delivered',
      'cancelled', 'refunded'
    )
  ),
  payment_status text DEFAULT 'pending',
  mp_payment_id text,
  payment_provider text DEFAULT 'mercadopago',
  external_reference text,
  total numeric(10,2),
  currency text DEFAULT 'ARS',
  payer_email text,
  customer_first_name text,
  customer_last_name text,
  customer_phone text,
  shipping_address jsonb,
  shipping_carrier text,
  shipping_service text,
  shipping_cost numeric(10,2) DEFAULT 0,
  shipping_label_url text,
  shipping_tracking_number text,
  shipping_postal_code text,
  tracking_token text UNIQUE DEFAULT gen_random_uuid()::text,
  notes text,
  coupon_code text,
  discount_amount numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. Order items
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  variant_id uuid REFERENCES product_variants(id),
  name text NOT NULL,
  variant_name text,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL
);

-- 11. Coupons
CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('percent','fixed')),
  value numeric(10,2) NOT NULL,
  min_amount numeric(10,2) DEFAULT 0,
  max_uses integer,
  uses_count integer DEFAULT 0,
  expires_at timestamptz,
  starts_at timestamptz,
  active boolean DEFAULT true,
  UNIQUE (tenant_id, code)
);

-- 12. Shipping zones (Emprendimiento + fallback si Empresa no usa Envia.com)
CREATE TABLE shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  position integer DEFAULT 0,
  active boolean DEFAULT true
);

CREATE TABLE contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  source text DEFAULT 'contact_form',
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_event_id text,
  status text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correo_argentino_user text,
  correo_argentino_password text,
  correo_argentino_customer_id text,
  correo_argentino_token text,
  correo_argentino_token_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 16. Blog categories
CREATE TABLE blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  position integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- 17. Blog posts
CREATE TABLE blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  blog_category_id uuid REFERENCES blog_categories(id),
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content text,
  cover_image text,
  cover_image_alt text,
  author text,
  status text DEFAULT 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  featured boolean DEFAULT false,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- 13. Trigger updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 14. Indexes de performance
CREATE INDEX idx_products_tenant_active ON products(tenant_id, active);
CREATE INDEX idx_products_tenant_slug ON products(tenant_id, slug);
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_contact_messages_tenant_created ON contact_messages(tenant_id, created_at DESC);
CREATE INDEX idx_order_events_order ON order_events(order_id);
CREATE INDEX idx_payment_events_order ON payment_events(order_id);
CREATE INDEX idx_blog_posts_tenant_published ON blog_posts(tenant_id, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_blog_posts_tenant_slug ON blog_posts(tenant_id, slug);
CREATE INDEX idx_blog_categories_tenant ON blog_categories(tenant_id);

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```
