---
skill: formulario-contacto
descripcion: Formulario de contacto con Server Action, validación Zod, honeypot antispam y Resend opcional
tipo: integración — todos los planes (si activado en briefing pregunta 21)
---

# Formulario de Contacto

Implementación estándar para la página `/contacto`. Funciona en los 3 planes.
Si Resend está configurado en el tenant → envía email al negocio.
Siempre guardar el lead en `contact_messages` para no perder consultas si Resend falla o no está configurado.

---

## Instalación

```bash
npm install zod@^3.24.0 react-hook-form @hookform/resolvers
# react-hook-form y zod ya están si el plan tiene checkout — verificar antes de instalar
```

> Con `@hookform/resolvers` v4 y Zod v4 se detectaron `ZodError` como
> `unhandledRejection` en browser. Usar Zod v3 (`zod@^3.24.0`).
> No existe la ruta `@hookform/resolvers/zod/v4` en la versión actual del paquete.

---

## Schema de validación

```typescript
// lib/validations/contact.ts
import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(2, 'Ingresá tu nombre').max(100),
  email: z.string().email('Ingresá un email válido'),
  phone: z.string().optional(),
  message: z.string().min(10, 'El mensaje es muy corto').max(1000),
  honeypot: z.string().max(0, 'Bot detected'),   // campo oculto — si tiene valor es spam
})

export type ContactFormData = z.infer<typeof contactSchema>
```

---

## Server Action

```typescript
// app/(public)/contacto/actions.ts
'use server'
import { z } from 'zod'
import { Resend } from 'resend'
import { contactSchema } from '@/lib/validations/contact'
import { getTenantConfig } from '@/lib/supabase/tenant'
import { createServiceClient } from '@/lib/supabase/server'

// Rate limiting simple por IP — sin paquetes externos
// ⚠️ ADVERTENCIA VERCEL: Este Map vive en memoria del proceso. En Vercel (serverless),
// cada invocación puede ser una instancia diferente — el Map NO persiste entre requests.
// El honeypot sigue siendo la protección principal. Para rate limiting real en producción,
// usar Upstash Redis (@upstash/ratelimit) o Vercel KV.
const attempts = new Map<string, { count: number; resetAt: number }>()

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

type ContactResult =
  | { ok: true }
  | { ok: false; error: string }

const isRateLimited = (ip: string): boolean => {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 })  // ventana de 1 min
    return false
  }
  if (entry.count >= 3) return true   // máx 3 envíos por minuto por IP
  entry.count++
  return false
}

export const sendContactForm = async (
  formData: z.infer<typeof contactSchema>,
  ip: string = 'unknown',
): Promise<ContactResult> => {
  try {
    // Honeypot — rechazar silenciosamente si el campo oculto tiene contenido
    if (formData.honeypot) return { ok: true }

    if (isRateLimited(ip)) {
      return { ok: false, error: 'Demasiados intentos. Esperá un momento.' }
    }

    const { name, email, phone, message } = contactSchema.parse(formData)
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
    const tenant = await getTenantConfig(tenantId)
    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safePhone = phone ? escapeHtml(phone) : null
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>')
    const siteName = escapeHtml(tenant.name ?? process.env.NEXT_PUBLIC_SITE_NAME ?? 'SitioHoy')
    const siteUrl = tenant.url ?? process.env.NEXT_PUBLIC_URL ?? 'https://sitiohoy.com.ar'
    const city = escapeHtml(tenant.origin_city ?? '')
    const primary = '#111827'
    const from = `${siteName} <contacto@sitiohoy.com.ar>`
    const supabase = createServiceClient()

    await supabase.from('contact_messages').insert({
      tenant_id: tenantId,
      name,
      email,
      phone: phone ?? null,
      message,
      source: 'contact_form',
    })

    if (tenant.resend_api_key && tenant.contact_email) {
      const resend = new Resend(tenant.resend_api_key)
      const baseHtml = (content: string, preheader: string = '') => `
        ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
        <div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;color:#111827">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
            <div style="background:${primary};color:#ffffff;padding:20px 24px;font-size:20px;font-weight:700">${siteName}</div>
            <div style="padding:24px">${content}</div>
            <div style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:13px">
              <a href="${siteUrl}" style="color:${primary}">${siteUrl}</a>${city ? ` · ${city}` : ''}
            </div>
          </div>
        </div>
      `

      await resend.emails.send({
        from,
        to: tenant.contact_email,
        replyTo: email,
        subject: `📬 ${safeName} te escribió desde ${siteName}`,
        headers: { 'X-Entity-Ref-ID': `contact-${tenantId}-${Date.now()}` },
        html: baseHtml(`
          <h1 style="margin:0 0 16px;font-size:22px">Nuevo mensaje de contacto</h1>
          <p><strong>Nombre:</strong> ${safeName}</p>
          <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          ${safePhone ? `<p><strong>Teléfono:</strong> ${safePhone}</p>` : ''}
          <p><strong>Mensaje:</strong></p>
          <blockquote style="border-left:4px solid ${primary};padding-left:16px;margin:16px 0">${safeMessage}</blockquote>
          <a href="mailto:${safeEmail}" style="display:inline-block;background:${primary};color:#ffffff;padding:12px 16px;border-radius:8px;text-decoration:none">Responder</a>
        `, `${safeName} escribió: "${safeMessage.slice(0, 60)}..."`),
      })

      await resend.emails.send({
        from,
        to: email,
        replyTo: tenant.contact_email,
        subject: `✅ Recibimos tu consulta — ${siteName}`,
        headers: { 'X-Entity-Ref-ID': `contact-confirmation-${tenantId}-${Date.now()}` },
        html: baseHtml(`
          <h1 style="margin:0 0 16px;font-size:22px">Recibimos tu consulta</h1>
          <p>Hola ${safeName}, gracias por escribirnos. Te vamos a responder a la brevedad.</p>
          <p><strong>Tu mensaje:</strong></p>
          <blockquote style="border-left:4px solid ${primary};padding-left:16px;margin:16px 0">${safeMessage}</blockquote>
          <a href="${siteUrl}" style="display:inline-block;background:${primary};color:#ffffff;padding:12px 16px;border-radius:8px;text-decoration:none">Volver al sitio</a>
        `, `Gracias por escribirnos, ${safeName}. Te respondemos pronto.`),
      })
    }

    return { ok: true }
  } catch (err) {
    if (err instanceof z.ZodError || (err as any)?.issues) {
      return { ok: false, error: 'Revisá los campos del formulario.' }
    }
    return { ok: false, error: 'Error inesperado.' }
  }
}
```

Reglas obligatorias:

- `to` del negocio sale de `tenants.contact_email`; nunca `RESEND_TO_EMAIL`.
- `resend_api_key` sale de `tenants.resend_api_key`.
- `from` siempre usa el dominio verificado de SitioHoy: `contacto@sitiohoy.com.ar`.
- Enviar dos emails por consulta: notificación al negocio y confirmación al visitante.
- Nunca enviar emails solo con `text`; siempre incluir `html` con estilos inline.
- Agregar `X-Entity-Ref-ID` único por email para reducir falsos positivos de spam.
- **El diseño del email debe ser coherente con el diseño del sitio**: usar el color primario del design system como header del email, el nombre del negocio, y estilos que reflejen la identidad visual. El email de confirmación al visitante debe indicarle que va a recibir respuesta pronto.
- **Siempre guardar en `contact_messages` primero**, independientemente de si Resend está configurado. Ningún lead se debe perder.

---

## Componente del formulario

```tsx
// app/(public)/contacto/ContactForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { contactSchema, type ContactFormData } from '@/lib/validations/contact'
import { sendContactForm } from './actions'

export const ContactForm = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    try {
      setStatus('loading')
      setServerError(null)
      const result = await sendContactForm(data)
      if (result.ok) {
        setStatus('ok')
        reset()
      } else {
        setServerError(result.error)
        setStatus('error')
      }
    } catch {
      setServerError('Error al enviar. Intentá de nuevo.')
      setStatus('error')
    }
  }

  if (status === 'ok') {
    return (
      <div className="contact-success" role="alert">
        <p>¡Mensaje enviado! Te respondemos a la brevedad.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="contact-form" noValidate>
      {/* Honeypot — oculto para humanos, visible para bots */}
      <input
        {...register('honeypot')}
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px' }}
        autoComplete="off"
      />

      <div className="field">
        <label htmlFor="name">Nombre *</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name')}
        />
        {errors.name && <span id="name-error" className="field-error">{errors.name.message}</span>}
      </div>

      <div className="field">
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && <span id="email-error" className="field-error">{errors.email.message}</span>}
      </div>

      <div className="field">
        <label htmlFor="phone">Teléfono <span className="optional">(opcional)</span></label>
        <input id="phone" type="tel" autoComplete="tel" {...register('phone')} />
      </div>

      <div className="field">
        <label htmlFor="message">Mensaje *</label>
        <textarea
          id="message"
          rows={5}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
          {...register('message')}
        />
        {errors.message && <span id="message-error" className="field-error">{errors.message.message}</span>}
      </div>

      {status === 'error' && (
        <p className="form-error" role="alert">
          {serverError ?? 'Hubo un error al enviar. Intentá de nuevo o escribinos por WhatsApp.'}
        </p>
      )}

      <button type="submit" disabled={status === 'loading'} className="btn-primary">
        {status === 'loading' ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  )
}
```

---

## Página

```tsx
// app/(public)/contacto/page.tsx
import type { Metadata } from 'next'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escribinos para consultas, pedidos o información.',
}

export default function ContactoPage() {
  return (
    <main>
      <section className="contact-page">
        <h1>Contacto</h1>
        <p>Completá el formulario y te respondemos a la brevedad.</p>
        <ContactForm />
      </section>
    </main>
  )
}
```

---

## Obtener IP en el Server Action

Para pasar la IP real al rate limiter en producción:

```typescript
// En el Server Action, importar headers de Next.js
import { headers } from 'next/headers'

// Al inicio de sendContactForm:
const headersList = await headers()
const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
```

---

## Verificación ✅

- [ ] Formulario valida en cliente (mensajes de error en español)
- [ ] Honeypot presente y oculto (no visible en pantalla)
- [ ] Rate limit: más de 3 envíos en 1 min muestra error
- [ ] Si Resend configurado: email llega al negocio con reply-to del visitante
- [ ] Mensaje guardado en `contact_messages`
- [ ] Si Resend no configurado: formulario igual funciona sin error visible y el lead queda guardado
- [ ] Estado de éxito reemplaza el formulario (no toast — evita problemas de accesibilidad)
- [ ] Mensaje de error tiene `role="alert"` para lectores de pantalla
