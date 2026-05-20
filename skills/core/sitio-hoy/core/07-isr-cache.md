---
skill: isr-cache
descripcion: ISR on-demand con unstable_cache y revalidateTag — invalidación quirúrgica
tipo: core — Módulos 2-3 al crear fetches públicos
---

# ISR On-Demand con Cache Tags

Todos los datos públicos se sirven desde caché estático e invalidan quirúrgicamente. **Nunca `revalidatePath('/')` global.**

## Tags

```typescript
// lib/cache-tags.ts
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

export const TAGS = {
  PRODUCTS:    `products-${TENANT_ID}`,
  PRODUCT:     (slug: string) => `product-${TENANT_ID}-${slug}`,
  CATEGORIES:  `categories-${TENANT_ID}`,
  ORDERS:      `orders-${TENANT_ID}`,
  ORDER:       (id: string) => `order-${TENANT_ID}-${id}`,
  COUPONS:     `coupons-${TENANT_ID}`,
  SITE_CONFIG: `site-config-${TENANT_ID}`,
  HOMEPAGE:    `homepage-${TENANT_ID}`,
  SHIPPING:    `shipping-zones-${TENANT_ID}`,
  TENANT:      `tenant-config-${TENANT_ID}`,   // ← getTenantConfig() en lib/supabase/tenant.ts
  BLOG_POSTS:      `blog-posts-${TENANT_ID}`,
  BLOG_POST:       (slug: string) => `blog-post-${TENANT_ID}-${slug}`,
  BLOG_CATEGORIES: `blog-categories-${TENANT_ID}`,
} as const
```

Todos los tags incluyen `NEXT_PUBLIC_TENANT_ID` para evitar colisiones entre tenants
si dos sitios comparten instancia de Vercel o runtime.

## Fetches cacheados

```typescript
// lib/data/products.ts
import { unstable_cache } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'
import { createServiceClient } from '@/lib/supabase/server'

const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!

export const getAllProducts = unstable_cache(
  async () => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, price, compare_at_price, stock, stock_unlimited, featured,
        product_images!product_images_product_id_fkey(url, alt, position),
        categories(name, slug)
      `)
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('created_at', { ascending: false })
    if (error) console.error('[getAllProducts]', error)
    return data ?? []
  },
  ['all-products'],
  { tags: [TAGS.PRODUCTS] },
)

export const getProductBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      const supabase = createServiceClient()
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, compare_at_price, stock, stock_unlimited, description,
          product_images!product_images_product_id_fkey(url, alt, position),
          product_variants!product_variants_product_id_fkey(id, name, stock, price, price_modifier),
          categories(name, slug)
        `)
        .eq('tenant_id', tenantId)
        .eq('slug', slug)
        .single()
      if (error) console.error('[getProductBySlug]', error)
      return data
    },
    [`product-detail-${slug}`],
    { tags: [TAGS.PRODUCTS, TAGS.PRODUCT(slug)] },
  )()

export const getCategories = unstable_cache(
  async () => {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, position')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('position')
    if (error) console.error('[getCategories]', error)
    return data ?? []
  },
  ['categories'],
  { tags: [TAGS.CATEGORIES] },
)
```

## Invalidación desde webhooks externos

```typescript
// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getTenantConfig } from '@/lib/supabase/tenant'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

const TABLE_TAGS: Record<string, string[]> = {
  products:         [`products-${TENANT_ID}`],
  product_images:   [`products-${TENANT_ID}`],
  product_variants: [`products-${TENANT_ID}`],
  categories:       [`categories-${TENANT_ID}`, `products-${TENANT_ID}`],
  coupons:          [`coupons-${TENANT_ID}`],
  tenants:          [`tenant-config-${TENANT_ID}`],
  shipping_zones:   [`shipping-zones-${TENANT_ID}`],
  blog_posts:       [`blog-posts-${TENANT_ID}`],
  blog_categories:  [`blog-categories-${TENANT_ID}`, `blog-posts-${TENANT_ID}`],
}

export async function POST(req: NextRequest) {
  const tenant = await getTenantConfig()
  const secret = tenant.revalidation_secret ?? process.env.REVALIDATION_SECRET

  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let tags: string[] = []

  try {
    const body = await req.json()

    if (body?.tag && typeof body.tag === 'string') {
      tags = [body.tag]
    } else if (body?.table === 'products' && body?.slug) {
      tags = [
        `product-${TENANT_ID}-${body.slug}`,
        `products-${TENANT_ID}`,
      ]
    } else if (body?.table) {
      tags = TABLE_TAGS[body.table] ?? [`products-${TENANT_ID}`]
    } else {
      tags = [`products-${TENANT_ID}`, `categories-${TENANT_ID}`]
    }
  } catch {
    tags = [`products-${TENANT_ID}`, `categories-${TENANT_ID}`]
  }

  for (const tag of tags) {
    revalidateTag(tag, 'default')
  }

  return NextResponse.json({ ok: true, tags })
}
```

El secret se lee desde `tenants.revalidation_secret`; `REVALIDATION_SECRET` queda solo
como fallback local/legacy.

## Tabla de invalidaciones por evento — granular

Regla: invalidar solo lo mínimo necesario. El tag granular primero, el colectivo solo cuando la lista también cambió.

| Evento | Tags a invalidar | Motivo |
|---|---|---|
| Producto: solo precio o stock | `product-{tenant}-{slug}` | No afecta la lista general |
| Producto: nombre, slug, imagen, categoría | `product-{tenant}-{slug}`, `products-{tenant}`, `homepage-{tenant}` | Puede afectar grids y home |
| Producto activado/desactivado | `products-{tenant}`, `homepage-{tenant}` | Cambia lo que se muestra en lista |
| Producto: toggle featured | `products-{tenant}`, `homepage-{tenant}` | Sección destacados en home |
| Producto eliminado | `products-{tenant}`, `homepage-{tenant}` | Ya no existe en lista |
| Categoría: nombre o posición | `categories-{tenant}` | No afecta productos directamente |
| Categoría eliminada | `categories-{tenant}`, `products-{tenant}` | Productos quedan sin categoría |
| Imagen de producto subida/eliminada | `products-{tenant}` | Afecta catálogo y detalle |
| Zona de envío modificada | `shipping-zones-{tenant}` | No afecta catálogo |
| Cupón creado/editado/eliminado | `coupons-{tenant}` | Checkout only |
| Config del sitio (nombre, logo, redes) | `tenant-config-{tenant}`, `site-config-{tenant}`, `homepage-{tenant}` | Afecta layout global |
| Pedido cambia de estado (admin) | `order-{tenant}-{id}`, `orders-{tenant}` | Dashboard y tracking |
| Pago aprobado (webhook MP) | `order-{tenant}-{id}`, `orders-{tenant}` | Mismo que arriba |
| Blog post: publicado/editado | `blog-post-{tenant}-{slug}`, `blog-posts-{tenant}`, `homepage-{tenant}` | Puede aparecer en home y listado |
| Blog post: despublicado/eliminado | `blog-posts-{tenant}`, `homepage-{tenant}` | Desaparece del listado |
| Blog categoría: editada/eliminada | `blog-categories-{tenant}`, `blog-posts-{tenant}` | Afecta navegación del blog |

## Helper de invalidación recomendado

```typescript
// lib/cache/invalidate.ts
import { revalidateTag } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'

export const invalidateProduct = (slug: string, { listChanged = false, featuredChanged = false } = {}) => {
  revalidateTag(TAGS.PRODUCT(slug), 'default')
  if (listChanged || featuredChanged) revalidateTag(TAGS.PRODUCTS, 'default')
  if (featuredChanged) revalidateTag(TAGS.HOMEPAGE, 'default')
}

export const invalidateOrder = (orderId: string) => {
  revalidateTag(TAGS.ORDER(orderId), 'default')
  revalidateTag(TAGS.ORDERS, 'default')
}

export const invalidateBlogPost = (slug: string, { listChanged = false } = {}) => {
  revalidateTag(TAGS.BLOG_POST(slug), 'default')
  if (listChanged) revalidateTag(TAGS.BLOG_POSTS, 'default')
  revalidateTag(TAGS.HOMEPAGE, 'default')
}

export const invalidateTenantConfig = () => {
  revalidateTag(TAGS.TENANT, 'default')
  revalidateTag(TAGS.HOMEPAGE, 'default')
}
```

## Reglas de oro (CRÍTICAS — aplicar sin excepción)

1. Tag granular primero (`product-{tenant}-{slug}`), luego colectivo (`products-{tenant}`) solo si la lista cambió
2. **Nunca `revalidatePath('/')`** — usar `revalidateTag(TAGS.HOMEPAGE, 'default')`
3. **PROHIBIDO `export const revalidate = N` en CUALQUIER página de catálogo o datos dinámicos** — solo ISR on-demand via webhooks de Supabase. Ya existe un trigger genérico en Supabase que llama a `/api/revalidate` cuando cambian datos.
4. **PROHIBIDO `dynamic = 'force-dynamic'` en páginas de catálogo** — rompe ISR y cada visita golpea Supabase.
5. **PROHIBIDO timer de revalidación** — no usar `revalidate = N` como timer fijo. Los datos se invalidan solo cuando cambian, via el webhook de Supabase.
6. `getTenantConfig()` **sin** `revalidate` — solo se invalida con `revalidateTag(TAGS.TENANT, 'default')`
7. En `unstable_cache`, siempre desestructurar `{ data, error }` y loguear `error`; si no, Supabase puede fallar silenciosamente y cachear `[]`.
8. **ISR on-demand es el ÚNICO approach permitido** para sitios con catálogo editable. La invalidación viene de Supabase → webhook → `revalidateTag()`.
9. **`generateStaticParams()` solo para catálogos pequeños (≤50 productos)**. Para Emprendimiento (≤200) y Empresa (ilimitados), NO usar `generateStaticParams()` — las páginas de producto se generan on-first-visit via ISR on-demand. Esto evita builds lentos.
10. **El endpoint `/api/revalidate` debe existir siempre** — es el receptor del webhook de Supabase. Sin él, el ISR on-demand no funciona.

## Triggers SQL multitenant Supabase

Crear como migración `0XX_isr_webhooks.sql`. Requiere `pg_net` habilitado.
La función lee `tenants.url` y `tenants.revalidation_secret` dinámicamente, por lo que
un solo set de triggers sirve para todos los tenants.

```sql
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

CREATE OR REPLACE FUNCTION isr_notify(p_tenant_id uuid, p_table text, p_slug text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url    text;
  _secret text;
  _body   jsonb;
BEGIN
  SELECT url, revalidation_secret
    INTO _url, _secret
    FROM public.tenants
   WHERE id = p_tenant_id;

  IF _url IS NULL OR _secret IS NULL THEN RETURN; END IF;

  IF p_slug IS NOT NULL THEN
    _body := jsonb_build_object('table', p_table, 'slug', p_slug);
  ELSE
    _body := jsonb_build_object('table', p_table);
  END IF;

  PERFORM net.http_post(
    url     := _url || '/api/revalidate',
    body    := _body,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _secret
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION trigger_isr_products()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'products', COALESCE(NEW.slug, OLD.slug));
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_products ON public.products;
CREATE TRIGGER isr_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION trigger_isr_products();

CREATE OR REPLACE FUNCTION trigger_isr_product_images()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'product_images');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_product_images ON public.product_images;
CREATE TRIGGER isr_product_images
AFTER INSERT OR UPDATE OR DELETE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION trigger_isr_product_images();

CREATE OR REPLACE FUNCTION trigger_isr_product_variants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'product_variants');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_product_variants ON public.product_variants;
CREATE TRIGGER isr_product_variants
AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION trigger_isr_product_variants();

CREATE OR REPLACE FUNCTION trigger_isr_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'categories');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_categories ON public.categories;
CREATE TRIGGER isr_categories
AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION trigger_isr_categories();

CREATE OR REPLACE FUNCTION trigger_isr_coupons()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'coupons');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_coupons ON public.coupons;
CREATE TRIGGER isr_coupons
AFTER INSERT OR UPDATE OR DELETE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION trigger_isr_coupons();

CREATE OR REPLACE FUNCTION trigger_isr_blog_posts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'blog_posts', COALESCE(NEW.slug, OLD.slug));
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_blog_posts ON public.blog_posts;
CREATE TRIGGER isr_blog_posts
AFTER INSERT OR UPDATE OR DELETE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION trigger_isr_blog_posts();

CREATE OR REPLACE FUNCTION trigger_isr_blog_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM isr_notify(COALESCE(NEW.tenant_id, OLD.tenant_id), 'blog_categories');
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS isr_blog_categories ON public.blog_categories;
CREATE TRIGGER isr_blog_categories
AFTER INSERT OR UPDATE OR DELETE ON public.blog_categories
FOR EACH ROW EXECUTE FUNCTION trigger_isr_blog_categories();
```

Importante: `supabase_functions.http_request` no acepta argumentos posicionales en
esta versión de Supabase. Usar siempre `net.http_post` con parámetros nombrados
(`url :=`, `body :=`, `headers :=`).
