---
skill: supabase-rls
descripcion: Políticas RLS multitenant — aislamiento por tenant_id para todas las tablas
tipo: core — ejecutar completo en Módulo 0, nunca modificar después
---

# Supabase RLS — Multitenant

Cada sitio es un tenant independiente. RLS garantiza que un tenant nunca vea datos de otro.

> Las políticas se crean completas en Módulo 0 aunque el admin no exista aún. El admin futuro se conecta sin necesidad de modificar el schema.

## Arquitectura de acceso

| Contexto | Cliente | Pasa por RLS |
|---|---|---|
| Páginas públicas (catálogo, home) | `createServiceClient()` — filtra por `tenant_id` en la query | ❌ |
| Server Actions del admin (futuro) | `createServerClient()` — JWT del admin | ✅ |
| Webhooks externos (MP, Envia) | `createServiceClient()` | ❌ |

> `SUPABASE_SERVICE_ROLE_KEY` **nunca** con prefijo `NEXT_PUBLIC_`. Solo en server.

## SQL completo de RLS

```sql
-- Helper function (en public — Supabase no permite crear en schema auth)
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
$$;

-- Patrón RLS por tabla (aplicar a: products, product_images, product_variants,
-- categories, subcategories, orders, order_items, coupons, shipping_zones,
-- contact_messages, order_events, payment_events)

-- Para cada tabla TABLA_NOMBRE:
-- (aplicar a: products, product_images, product_variants,
-- categories, subcategories, orders, order_items, coupons, shipping_zones,
-- contact_messages, order_events, payment_events, blog_categories, blog_posts)
ALTER TABLE TABLA_NOMBRE ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON TABLA_NOMBRE FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());

CREATE POLICY "tenant_insert" ON TABLA_NOMBRE FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "tenant_update" ON TABLA_NOMBRE FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "tenant_delete" ON TABLA_NOMBRE FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_id());
```

## Políticas especiales

### `orders` — compradores anónimos pueden ver su propio pedido por tracking_token

**NO usar RLS anon para tracking.** El JWT anon de Supabase no lleva claims personalizados,
por lo que una policy anon sobre `tracking_token` no funciona en la práctica.

**Patrón correcto:** Server Action con service role, filtrando `tenant_id` + `tracking_token`:

```typescript
// lib/data/orders.ts
export const getOrderByToken = async (trackingToken: string) => {
  const supabase = createServiceClient()   // service role — solo server
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
  const { data } = await supabase
    .from('orders')
    .select(`
      id, status, payment_status, total, currency,
      customer_first_name, customer_last_name,
      shipping_tracking_number, shipping_carrier,
      created_at, updated_at,
      order_items(name, variant_name, quantity, unit_price)
    `)
    .eq('tenant_id', tenantId)
    .eq('tracking_token', trackingToken)
    .single()
  return data
}
```

```typescript
// app/(public)/pedidos/[token]/page.tsx
import { getOrderByToken } from '@/lib/data/orders'
import { notFound } from 'next/navigation'

export default async function TrackingPage({ params }: { params: { token: string } }) {
  const order = await getOrderByToken(params.token)
  if (!order) notFound()
  // render...
}
```

La página de tracking **nunca expone RLS anon** — usa service role + filtro doble `tenant_id` + `tracking_token`.

### `order_items` — acceso via orders (JOIN implícito)

```sql
CREATE POLICY "tenant_select_items" ON order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.tenant_id = public.get_tenant_id()
    )
  );
```

### `user_tenants`

```sql
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_relations" ON user_tenants FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

### `tenants`

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_tenant" ON tenants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE user_tenants.tenant_id = tenants.id
        AND user_tenants.user_id = auth.uid()
    )
  );
-- UPDATE/DELETE solo via service role (operaciones de plataforma)
```

### Storage (`storage.objects`)

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Imágenes públicas visibles para todos
CREATE POLICY "public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'public_assets');

-- Solo el admin del tenant puede subir/editar/borrar en su carpeta
CREATE POLICY "tenant_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'public_assets' AND
    (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );

CREATE POLICY "tenant_update_storage" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'public_assets' AND
    (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );

CREATE POLICY "tenant_delete_storage" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'public_assets' AND
    (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );
```

## Provisionar usuario admin

```typescript
// lib/supabase/provision.ts — ejecutar UNA VEZ al crear el sitio
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const provisionTenant = async (email: string, password: string, tenantId: string) => {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    app_metadata: { tenant_id: tenantId, role: 'admin' },
    email_confirm: true,
  })
  if (error) throw error

  // Crear relación user_tenants
  await supabaseAdmin.from('user_tenants').insert({
    user_id: data.user.id,
    tenant_id: tenantId,
    role: 'admin',
  })

  return data
}
```

## Checklist RLS ✅

- [ ] `public.get_tenant_id()` function creada
- [ ] RLS habilitado en todas las tablas: products, product_images, product_variants, categories, subcategories, orders, order_items, coupons, shipping_zones, contact_messages, order_events, payment_events, platform_config, user_tenants, tenants, blog_categories, blog_posts
- [ ] Políticas CRUD creadas para cada tabla
- [ ] Bucket `public_assets` creado con políticas de storage
- [ ] Usuario admin provisionado con `tenant_id` en `app_metadata`
- [ ] Fila en `tenants` con datos del cliente
- [ ] Fila en `user_tenants` con `role = 'admin'`
- [ ] Verificar que con el JWT del admin se ven solo los datos de ese tenant
