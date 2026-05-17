# Schema Contract SitioHoy

## Decisiones

- Schema completo en todos los planes para permitir upgrades.
- `tenants` guarda credenciales por cliente: MercadoPago, Resend, Envia.com y Umami.
- `platform_config` guarda credenciales de plataforma, incluyendo usuario/password/token de Correo Argentino.
- `tenants.correo_argentino_customer_id` identifica al negocio en Correo Argentino.
- `.env` solo guarda infraestructura, tenant activo y secrets de webhooks.
- `tenants.url` y `tenants.revalidation_secret` son obligatorios para ISR on-demand multitenant.
- Triggers ISR leen URL/secret desde `tenants`; no hardcodear dominios ni usar `supabase_functions.http_request`.
- `contact_messages` conserva leads aunque Resend no este activo.
- `tenants.contact_email` es el destino de consultas del negocio; no usar `RESEND_TO_EMAIL`.
- `order_events` y `payment_events` son auditoria, no UI principal.
- `orders.status` nace con constraint completo para pagos, fulfillment y devoluciones.
- `products.stock` y `products.stock_unlimited` existen para productos sin variantes.
- `products.weight_grams` y dimensiones existen para cotizar envíos; si son estimados deben quedar documentados en tracking.

## Campos que no deben renombrarse

- `products.compare_at_price`, no `compare_price`.
- `orders.total`, no `total_amount`.
- `orders.payer_email`, no `customer_email`.
- `orders.mp_payment_id`, no `payment_id`.
- `tenants.umami_url` es URL del script.
- `tenants.umami_website_id` es el website id.
- `tenants.revalidation_secret` es el secret de `/api/revalidate`, no una env var global.
- `platform_config.correo_argentino_user/password/token` son credenciales de plataforma, no por cliente.
- `tenants.correo_argentino_customer_id` es por cliente.
- `products.weight_grams`, no `weight` ni `peso`.

## FKs duplicadas — problema conocido

Supabase a veces crea FKs adicionales con nombres como `fk_images_product` o
`fk_variants_product` además de las que genera el `REFERENCES` inline en el
`CREATE TABLE`. Esto hace que PostgREST no pueda resolver la relación y devuelva
error `PGRST201`.

Solución al detectar este error:
1. Consultar FKs duplicadas:
```sql
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
  AND confrelid::regclass::text IN ('products', 'product_images', 'product_variants')
ORDER BY conrelid::regclass::text;
```
2. Eliminar la FK extra (la que no sigue el patrón `tabla_columna_fkey`):
```sql
ALTER TABLE public.product_images DROP CONSTRAINT IF EXISTS fk_images_product;
ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS fk_variants_product;
```

Para prevenir el problema, no usar `ADD CONSTRAINT ... FOREIGN KEY` separado si
la FK ya está declarada con `REFERENCES` inline en el `CREATE TABLE`.

## Tracking de pedidos

No exponer la tabla `orders` directamente a anon por RLS con claims especiales.
Implementar una funcion server-side que reciba `tracking_token`, filtre tambien
por `tenant_id` y devuelva solo los campos seguros para el comprador.
