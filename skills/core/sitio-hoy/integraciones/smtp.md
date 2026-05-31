---
skill: smtp
descripcion: Emails transaccionales con SMTP (Hostinger) via nodemailer
tipo: integración — Emprendimiento y Empresa (Módulo 4, si activado en onboarding)
---

# Integración SMTP (nodemailer)

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

Credenciales: `tenants.smtp_user` y `tenants.smtp_pass` (no en `.env`).

El remitente (`from`) usa directamente el `smtp_user` del tenant (ej. `contacto@sitiohoy.com.ar`
o el email que tenga configurado en Hostinger). Como el envío se hace desde el mismo servidor
SMTP autenticado, SPF/DKIM se resuelven automáticamente por Hostinger.

## Cliente base

```typescript
// lib/smtp/client.ts
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { getTenantConfig } from '@/lib/config/tenant'

export async function getSmtpTransporter(): Promise<{ transporter: Transporter; from: string } | null> {
  const config = await getTenantConfig()
  if (!config.smtp_user || !config.smtp_pass) return null

  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  })

  return {
    transporter,
    from: `${config.name} <${config.smtp_user}>`,
  }
}
```

## Email de confirmación de compra

```typescript
// lib/smtp/emails/order-confirmation.ts
import { getSmtpTransporter } from '../client'
import { createServiceClient } from '@/lib/supabase/server'

export const sendOrderConfirmation = async (orderId: string) => {
  const client = await getSmtpTransporter()
  if (!client) return  // Silently skip if not configured

  const supabase = createServiceClient()
  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(name, variant_name, quantity, unit_price)')
    .eq('id', orderId)
    .single()

  if (!order) return

  const trackingUrl = `${process.env.NEXT_PUBLIC_URL}/seguimiento?order=${orderId}`
  const itemsHtml = order.order_items.map((i: any) => `
    <tr>
      <td>${i.name}${i.variant_name ? ` (${i.variant_name})` : ''}</td>
      <td style="text-align:center">x${i.quantity}</td>
      <td style="text-align:right">$${Number(i.unit_price).toLocaleString('es-AR')}</td>
    </tr>
  `).join('')

  await client.transporter.sendMail({
    from: client.from,
    to: order.payer_email,     // ← columna correcta: payer_email
    subject: `Pedido confirmado — ${process.env.NEXT_PUBLIC_SITE_NAME}`,
    html: `
      <h1>¡Gracias ${order.customer_first_name}!</h1>
      <p>Tu pedido fue confirmado.</p>
      <table border="0" cellpadding="8" width="100%">
        <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          ${order.shipping_cost > 0 ? `<tr><td colspan="2">Envío</td><td style="text-align:right">$${Number(order.shipping_cost).toLocaleString('es-AR')}</td></tr>` : ''}
          ${order.discount_amount > 0 ? `<tr><td colspan="2">Descuento</td><td style="text-align:right">-$${Number(order.discount_amount).toLocaleString('es-AR')}</td></tr>` : ''}
          <tr><td colspan="2"><strong>Total</strong></td><td style="text-align:right"><strong>$${Number(order.total).toLocaleString('es-AR')}</strong></td></tr>
        </tfoot>
      </table>
      <p><a href="${trackingUrl}">Seguir mi pedido →</a></p>
    `,
  })
}
```

## Email de cambio de estado

```typescript
// lib/smtp/emails/order-status.ts
import { getSmtpTransporter } from '../client'
import { createServiceClient } from '@/lib/supabase/server'

const STATUS_LABELS: Record<string, string> = {
  confirmed:  'Confirmado',
  preparing:  'En preparación',
  shipped:    'Enviado',
  delivered:  'Entregado',
  cancelled:  'Cancelado',
}

export const sendOrderStatusUpdate = async (orderId: string, newStatus: string, trackingNumber?: string, carrier?: string) => {
  const client = await getSmtpTransporter()
  if (!client) return

  const supabase = createServiceClient()
  const { data: order } = await supabase
    .from('orders')
    .select('payer_email, customer_first_name')
    .eq('id', orderId)
    .single()

  if (!order) return

  const label = STATUS_LABELS[newStatus] ?? newStatus
  const trackingUrl = `${process.env.NEXT_PUBLIC_URL}/seguimiento?order=${orderId}`

  const shippingInfo = trackingNumber
    ? `<p>Transportista: <strong>${carrier}</strong><br>Número de seguimiento: <strong>${trackingNumber}</strong></p>`
    : ''

  await client.transporter.sendMail({
    from: client.from,
    to: order.payer_email,
    subject: `Tu pedido está: ${label} — ${process.env.NEXT_PUBLIC_SITE_NAME}`,
    html: `
      <h1>Actualización de tu pedido</h1>
      <p>Hola ${order.customer_first_name}, tu pedido ahora está: <strong>${label}</strong>.</p>
      ${shippingInfo}
      <p><a href="${trackingUrl}">Ver detalle de mi pedido →</a></p>
    `,
  })
}
```

## Regla de branding: TODOS los emails deben tener identidad visual

Tanto los emails de orden (confirmación, cambio de estado) como los de contacto deben usar
el mismo patrón de diseño:

- **Header**: color primario del negocio + nombre del negocio + emoji del rubro
- **Preheader**: texto invisible para preview del inbox (90 chars)
- **Contenedor**: `max-width: 560px`, fondo gris `#f5f5f5`, `border-radius: 12px`
- **Acentos**: `border-left: 4px solid {color-primario}` en bloques destacados
- **Botón CTA**: color primario para "Ver mi pedido", verde `#25D366` para WhatsApp
- **Footer**: dominio del sitio + "generado automáticamente"

No enviar emails con HTML genérico sin header/footer. El diseño del email debe ser
consistente con la identidad visual del sitio generado.

## `lib/email/templates.ts` — templates HTML con estilos inline (OBLIGATORIO)

El scaffold debe generar este archivo desde el inicio. Los clientes de email ignoran
`<style>` y CSS externo — todos los estilos DEBEN ser inline.

```typescript
// lib/email/templates.ts

interface EmailTemplateOptions {
  siteName: string
  siteUrl: string
  primaryColor: string
  city?: string
}

const baseLayout = (
  opts: EmailTemplateOptions,
  content: string,
  preheader?: string,
) => `
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;color:#111827">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
      <div style="background:${opts.primaryColor};color:#ffffff;padding:20px 24px;font-size:20px;font-weight:700">
        ${opts.siteName}
      </div>
      <div style="padding:24px">${content}</div>
      <div style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:13px">
        <a href="${opts.siteUrl}" style="color:${opts.primaryColor}">${opts.siteUrl}</a>${opts.city ? ` · ${opts.city}` : ''}
      </div>
    </div>
  </div>
`

export const contactConfirmationEmail = (
  opts: EmailTemplateOptions & { name: string; message: string },
) =>
  baseLayout(
    opts,
    `<h1 style="margin:0 0 16px;font-size:22px">Recibimos tu consulta</h1>
     <p>Hola ${opts.name}, gracias por escribirnos. Te vamos a responder a la brevedad.</p>
     <blockquote style="border-left:4px solid ${opts.primaryColor};padding-left:16px;margin:16px 0">
       ${opts.message}
     </blockquote>
     <a href="${opts.siteUrl}" style="display:inline-block;background:${opts.primaryColor};color:#ffffff;padding:12px 16px;border-radius:8px;text-decoration:none">Volver al sitio</a>`,
    `Gracias por escribirnos, ${opts.name}. Te respondemos pronto.`,
  )

export const contactNotificationEmail = (
  opts: EmailTemplateOptions & {
    name: string; email: string; phone?: string | null; message: string
  },
) =>
  baseLayout(
    opts,
    `<h1 style="margin:0 0 16px;font-size:22px">Nuevo mensaje de contacto</h1>
     <p><strong>Nombre:</strong> ${opts.name}</p>
     <p><strong>Email:</strong> <a href="mailto:${opts.email}">${opts.email}</a></p>
     ${opts.phone ? `<p><strong>Teléfono:</strong> ${opts.phone}</p>` : ''}
     <p><strong>Mensaje:</strong></p>
     <blockquote style="border-left:4px solid ${opts.primaryColor};padding-left:16px;margin:16px 0">
       ${opts.message}
     </blockquote>
     <a href="mailto:${opts.email}" style="display:inline-block;background:${opts.primaryColor};color:#ffffff;padding:12px 16px;border-radius:8px;text-decoration:none">Responder</a>`,
    `${opts.name} escribió: "${opts.message.slice(0, 60)}..."`,
  )

export const orderConfirmationEmail = (
  opts: EmailTemplateOptions & {
    customerName: string
    itemsHtml: string
    shippingCost?: number
    discountAmount?: number
    total: number
    trackingUrl: string
  },
) =>
  baseLayout(
    opts,
    `<h1 style="margin:0 0 16px;font-size:22px">¡Gracias ${opts.customerName}!</h1>
     <p>Tu pedido fue confirmado.</p>
     <table border="0" cellpadding="8" width="100%">
       <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th></tr></thead>
       <tbody>${opts.itemsHtml}</tbody>
       <tfoot>
         ${(opts.shippingCost ?? 0) > 0 ? `<tr><td colspan="2">Envío</td><td style="text-align:right">$${opts.shippingCost!.toLocaleString('es-AR')}</td></tr>` : ''}
         ${(opts.discountAmount ?? 0) > 0 ? `<tr><td colspan="2">Descuento</td><td style="text-align:right">-$${opts.discountAmount!.toLocaleString('es-AR')}</td></tr>` : ''}
         <tr><td colspan="2"><strong>Total</strong></td><td style="text-align:right"><strong>$${opts.total.toLocaleString('es-AR')}</strong></td></tr>
       </tfoot>
     </table>
     <a href="${opts.trackingUrl}" style="display:inline-block;background:${opts.primaryColor};color:#ffffff;padding:12px 16px;border-radius:8px;text-decoration:none;margin-top:16px">Seguir mi pedido →</a>`,
    `Pedido confirmado por $${opts.total.toLocaleString('es-AR')}`,
  )
```

**Regla**: Nunca enviar emails con solo `text:` sin `html:` — siempre incluir `html:`.
Usar las funciones de `lib/email/templates.ts` para generar el HTML.

## Integrar en webhook MercadoPago

Al final del handler del webhook (después de actualizar el pedido en Supabase):

```typescript
if (paymentData.status === 'approved') {
  await sendOrderConfirmation(orderId)  // No bloquea si falla
}
```

## Mejores prácticas de diseño de emails

Aplicar siempre en todos los emails del proyecto:

### Subject line
- Incluir emoji relevante al inicio: `📬`, `✅`, `🛵`, etc.
- Mencionar el nombre del remitente o contexto concreto
- Formato: `{emoji} {contexto específico} — {sitio}`
- Ejemplo: `📬 Valentin te escribió desde misitio.com.ar`
- Evitar: `Nuevo mensaje de contacto — Nombre` (genérico, sin personalidad)

### Preheader
Siempre incluir texto de preheader invisible (aparece en la preview del cliente de mail):
```html
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
  {texto preview de 90 chars}...
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
```

### Estructura HTML
- Usar tablas para layout (compatibilidad Gmail/Outlook)
- Estilos inline siempre — nunca `<style>` en `<head>`
- `max-width: 560px` centrado, fondo gris claro `#f5f5f5`
- Border-radius `12px` en el contenedor principal
- Header con `background-color` del color primario del negocio

### Identidad visual
- Header: color primario del negocio + nombre + emoji del rubro
- Bordes de acento: `border-left: 4px solid {color-primario}`
- Botón CTA: color acorde al contexto (verde para WhatsApp, primario para ver pedido)
- Footer con dominio y texto "generado automáticamente"

### Botón de respuesta en emails de contacto
- Siempre incluir botón `mailto:${email}` para responder al remitente con un click
- Color `#25D366` si la alternativa es WhatsApp, color primario si es email

## Verificación

- [ ] `smtp_user` y `smtp_pass` configurados en tabla `tenants`
- [ ] Email de confirmación llega al comprar en modo TEST
- [ ] El email tiene nombre, número de pedido y total correcto
- [ ] No cae en spam (SPF/DKIM gestionados automáticamente por Hostinger)
- [ ] El `from` usa `config.smtp_user` (ej. `contacto@sitiohoy.com.ar`)
- [ ] Si `smtp_user` o `smtp_pass` están vacíos, el flujo no lanza error (silently skips)
- [ ] Conexión SMTP funciona: `transporter.verify()` no lanza error en desarrollo
- [ ] Puerto 465 con `secure: true` (SSL directo, no STARTTLS en 587)
- [ ] Todos los emails usan `html:` generado por `lib/email/templates.ts`, nunca solo `text:`
- [ ] `lib/email/templates.ts` existe y exporta los 3 templates: `contactConfirmationEmail`, `contactNotificationEmail`, `orderConfirmationEmail`
- [ ] Estilos del email son 100% inline — ningún `<style>` ni CSS externo
