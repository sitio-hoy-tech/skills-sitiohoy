# Launch Checklist SitioHoy

## Preflight

- `git status` revisado.
- `npm run build` aprobado.
- `npm run sitiohoy:validate` aprobado.
- `npm run sitiohoy:qa` aprobado o reporte manual adjunto.
- `.env.example` actualizado.
- `sitiohoy.config.json` tiene `tenantId`, `siteUrl` y plan correctos.

## GitHub

- Repo creado en la organización correcta.
- Rama principal protegida si aplica.
- Secrets nunca commiteados.
- Primer push realizado.

## Supabase

- Proyecto creado.
- Migraciones aplicadas.
- Storage bucket `product-images` creado.
- Fila `tenants` creada/actualizada.
- Usuario admin creado con Supabase Admin API.
- Fila `user_tenants` creada con rol `owner`.
- Categorías y productos demo cargados.
- RLS probada con anon y authenticated.

## Vercel

- Proyecto importado desde GitHub.
- Región de funciones configurada en `sao1` si el plan lo permite.
- Env vars cargadas en Production, Preview y Development.
- `NEXT_PUBLIC_URL` apunta al dominio final.
- Deploy preview revisado.
- Deploy production aprobado.

## Integraciones

- MercadoPago: tokens de test antes de producción, webhook configurado.
- Resend: dominio verificado si aplica.
- Envia.com: ambiente test antes de producción.
- Umami: `umami_url` y `umami_website_id` guardados por tenant.
- WhatsApp: links con mensaje y teléfono correctos.

## Go-live

- Dominio con SSL activo.
- Redirect sin `www` hacia `www` si aplica.
- Compra real mínima y reembolso si hay checkout.
- Formulario contacto guarda en `contact_messages`.
- Reporte QA final generado.
