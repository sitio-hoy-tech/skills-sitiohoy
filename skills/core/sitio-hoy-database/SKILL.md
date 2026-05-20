---
name: sitio-hoy-database
description: >
  Crear y validar la base de datos Supabase para sitios SitioHoy: migracion
  inicial, RLS multitenant, storage, seeds, eventos de pedidos/pagos y contrato
  de columnas. Usar despues del scaffold y antes de escribir queries.
---

# SitioHoy Database

Usar esta skill para que la base deje de ser copiada a mano y pase a ser un
contrato repetible.

## Principio

El schema debe ser estable para todos los planes. Las features se apagan por
configuracion, no por columnas faltantes. Esto permite upgrades de Esencial a
Emprendimiento o Empresa sin rehacer migraciones base.

## Workflow

1. Leer `sitiohoy.config.json` si existe.
2. Generar migracion y seed admin:
   ```bash
   node scripts/generate-supabase-migration.mjs --plan esencial
   ```
   El script genera:
   - `supabase/migrations/001_initial_schema.sql` — schema completo
   - `supabase/migrations/002_seed_admin.sql` — tenant inicial + usuario admin
   - ISR on-demand con triggers `pg_net` para revalidar el sitio del tenant
   - `credentials.local.json` — email y password del admin (gitignoreado automáticamente)
3. Crear el usuario admin en Supabase Auth **antes** de ejecutar el seed:
   - El email debe ser `admin{slug-del-negocio}@sitiohoy.com.ar`.
   - Crear con el script de provisioning o Supabase Admin API usando las credenciales de `credentials.local.json`.
   - Las credenciales están en `credentials.local.json`
4. Aplicar las migraciones con Supabase CLI:
   ```bash
   supabase link --project-ref PROJECT_REF
   supabase db push
   ```
   No usar SQL Editor/Dashboard salvo bloqueo explícito de CLI, y registrar el bloqueo en tracking.
5. Crear o revisar:
   - `types/database.ts` o `types/database.generated.ts` con `supabase gen types typescript --linked`
6. Validar que:
   - todas las tablas tengan `tenant_id` cuando corresponde;
   - RLS este habilitado;
   - service role solo se use en server;
   - queries publicas filtren por `tenant_id`;
   - contact forms no pierdan mensajes.

## Contrato base

Tablas base siempre presentes:
- `tenants`
- `user_tenants`
- `categories`
- `subcategories`
- `products`
- `product_images`
- `product_variants`
- `orders`
- `order_items`
- `coupons`
- `shipping_zones`
- `contact_messages`
- `order_events`
- `payment_events`
- `platform_config`
- `blog_categories` — categorías de blog con tenant_id y slug único
- `blog_posts` — artículos de blog con status (draft/published/archived), cover_image, excerpt, content, published_at
- `site_pages` (opcional, plan Empresa) — metadata de páginas para SEO y navegación dinámica. No tiene schema definido aún; definir en `05-base-datos.md` si se implementa

`shipping_zones` queda sin uso en Empresa si se usa Envia.com, pero existe para
fallback y upgrades.

## Mejoras incluidas respecto al schema anterior

- `umami_website_id` en `tenants` para evitar ambiguedad entre script URL e ID.
- `contact_messages` para que un formulario sin Resend no pierda leads.
- `order_events` y `payment_events` para auditoria de checkout y webhooks.
- RLS consistente en tablas multitenant.
- Indices por `tenant_id`, `slug`, `created_at` y relaciones frecuentes.
- Productos con `weight_grams`, dimensiones y `shipping_required` para Correo Argentino/Envia.com.
- Productos con `stock` y `stock_unlimited`; variantes con `stock` propio cuando existan.
- Seeds de productos deben respetar columnas reales del schema. No insertar `status`, `is_visible`, `image`, `is_primary`, `compare_price`, `weight_grams` en variantes ni `position` en variantes.
- Si se insertan variantes en seed, usar `stock > 0` para que "Agregar al carrito" quede habilitado durante QA.
- `orders.status` con constraint completo desde el inicio:
  `pending`, `pending_payment`, `paid`, `payment_failed`, `processing`, `confirmed`, `shipped`, `delivered`, `cancelled`, `refunded`.
- `tenants.contact_email` para formularios de contacto; no usar `RESEND_TO_EMAIL`.
- `tenants.url` y `tenants.revalidation_secret` para ISR on-demand multitenant.
- Credenciales de acceso Correo Argentino en `platform_config`; solo `tenants.correo_argentino_customer_id` es por negocio.
- Si el proyecto usa Correo Argentino/Envia, el seed del tenant debe incluir `origin_postal_code`; sin ese campo no se puede cotizar envío.
- Crear los triggers ISR como migración dedicada `0XX_isr_webhooks.sql` cuando se agreguen a un proyecto existente.

## Reglas de seguridad

- Nunca confiar en precios, stock, envio o descuentos del cliente.
- Nunca hardcodear la URL del sitio en triggers SQL. Leer siempre `url` y `revalidation_secret` desde `tenants`.
- Nunca usar `supabase_functions.http_request` con argumentos posicionales; usar `net.http_post` con parámetros nombrados (`url :=`, `body :=`, `headers :=`).
- Al crear el tenant en seed, poblar siempre `url` y `revalidation_secret`.
- Generar `revalidation_secret` con `openssl rand -hex 32` o `randomBytes(32).toString('hex')`; debe ser único por tenant.
- No usar `dynamic = 'force-dynamic'` ni `revalidate = N` en páginas de catálogo. El catálogo editable usa ISR on-demand.
- Recalcular totales server-side antes de crear pagos.
- En webhooks, actualizar por `id` y `tenant_id`.
- Guardar payloads de pagos en `payment_events` antes de mutar estado.
- La pagina de seguimiento debe usar Server Action o RPC filtrada por
  `tenant_id` + `tracking_token`, no una policy anon basada en JWT inventado.

## Seguridad de credenciales

- `credentials.local.json` contiene email y password del admin, generado con contraseña aleatoria segura.
- El email del admin sigue el formato `admin{slug-del-negocio}@sitiohoy.com.ar`.
- El script agrega automáticamente `credentials.local.json` a `.gitignore`.
- Nunca commitear ese archivo. Compartir credenciales por canal seguro (Bitwarden, 1Password, etc).

## Recursos

- `scripts/generate-supabase-migration.mjs`: genera la migracion inicial + seed admin.
- `references/schema-contract.md`: resumen de tablas y decisiones.
- `references/isr-webhooks.sql`: template para migración `0XX_isr_webhooks.sql` en proyectos existentes.
